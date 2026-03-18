import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { AwsClient } from "https://esm.sh/aws4fetch@1.0.20";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { dancer_id, image_base64 } = await req.json();
    if (!dancer_id || !image_base64) {
      return new Response(JSON.stringify({ error: "dancer_id and image_base64 required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const region = Deno.env.get("AWS_REGION") ?? "us-west-2";
    const collectionId = Deno.env.get("REKOGNITION_COLLECTION_ID") ?? "2nyt-dancers";
    const endpoint = `https://rekognition.${region}.amazonaws.com/`;

    const aws = new AwsClient({
      accessKeyId: Deno.env.get("AWS_ACCESS_KEY_ID")!,
      secretAccessKey: Deno.env.get("AWS_SECRET_ACCESS_KEY")!,
      region,
      service: "rekognition",
    });

    // Ensure collection exists (ignore AlreadyExistsException)
    await aws.fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-amz-json-1.1",
        "X-Amz-Target": "RekognitionService.CreateCollection",
      },
      body: JSON.stringify({ CollectionId: collectionId }),
    });

    // Delete any existing face for this dancer first (re-enrollment)
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );
    const { data: existing } = await supabase
      .from("dancers")
      .select("facial_hash")
      .eq("id", dancer_id)
      .single();

    if (existing?.facial_hash) {
      await aws.fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-amz-json-1.1",
          "X-Amz-Target": "RekognitionService.DeleteFaces",
        },
        body: JSON.stringify({ CollectionId: collectionId, FaceIds: [existing.facial_hash] }),
      });
    }

    // Index the face — Bytes must be a base64 string in the JSON protocol
    const indexResp = await aws.fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-amz-json-1.1",
        "X-Amz-Target": "RekognitionService.IndexFaces",
      },
      body: JSON.stringify({
        CollectionId: collectionId,
        Image: { Bytes: image_base64 },
        ExternalImageId: dancer_id,
        MaxFaces: 1,
        QualityFilter: "AUTO",
        DetectionAttributes: [],
      }),
    });

    if (!indexResp.ok) {
      const errText = await indexResp.text();
      return new Response(JSON.stringify({ error: errText }), {
        status: indexResp.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const indexData = await indexResp.json();
    const faceRecord = indexData.FaceRecords?.[0];
    if (!faceRecord) {
      return new Response(JSON.stringify({ error: "No face detected in image" }), {
        status: 422,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const faceId = faceRecord.Face.FaceId;

    // Save FaceId to dancers.facial_hash
    const { error: updateError } = await supabase
      .from("dancers")
      .update({ facial_hash: faceId })
      .eq("id", dancer_id);

    if (updateError) {
      return new Response(JSON.stringify({ error: updateError.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ success: true, face_id: faceId }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
