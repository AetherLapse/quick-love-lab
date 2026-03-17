import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { AwsClient } from "https://esm.sh/aws4fetch@1.0.20";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const MIN_CONFIDENCE = 90;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { image_base64 } = await req.json();
    if (!image_base64) {
      return new Response(JSON.stringify({ error: "image_base64 required" }), {
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

    const imageBytes = Uint8Array.from(atob(image_base64), (c) => c.charCodeAt(0));

    const searchResp = await aws.fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-amz-json-1.1",
        "X-Amz-Target": "RekognitionService.SearchFacesByImage",
      },
      body: JSON.stringify({
        CollectionId: collectionId,
        Image: { Bytes: Array.from(imageBytes) },
        MaxFaces: 1,
        FaceMatchThreshold: MIN_CONFIDENCE,
      }),
    });

    if (!searchResp.ok) {
      const errText = await searchResp.text();
      // InvalidParameterException = no face in image
      if (errText.includes("InvalidParameterException") || errText.includes("no face")) {
        return new Response(JSON.stringify({ matched: false, reason: "no_face" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ error: errText }), {
        status: searchResp.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const searchData = await searchResp.json();
    const match = searchData.FaceMatches?.[0];

    if (!match || match.Similarity < MIN_CONFIDENCE) {
      return new Response(JSON.stringify({ matched: false, reason: "no_match" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const faceId = match.Face.FaceId;

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: dancer, error: lookupError } = await supabase
      .from("dancers")
      .select("id, stage_name, entrance_fee, is_active")
      .eq("facial_hash", faceId)
      .single();

    if (lookupError || !dancer) {
      return new Response(JSON.stringify({ matched: false, reason: "dancer_not_found" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!dancer.is_active) {
      return new Response(JSON.stringify({ matched: false, reason: "dancer_inactive" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(
      JSON.stringify({
        matched: true,
        dancer_id: dancer.id,
        stage_name: dancer.stage_name,
        entrance_fee: dancer.entrance_fee,
        confidence: Math.round(match.Similarity),
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
