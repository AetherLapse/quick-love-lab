SET session_replication_role = replica;

--
-- PostgreSQL database dump
--

-- \restrict IKcOgZqI8mMd3k9HLYdxvaDVfFGEmkcduNkLQ9w9EwTQolBMEUQu9Bgn1s7nGxd

-- Dumped from database version 17.6
-- Dumped by pg_dump version 17.6

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Data for Name: audit_log_entries; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: custom_oauth_providers; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: flow_state; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: users; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

INSERT INTO "auth"."users" ("instance_id", "id", "aud", "role", "email", "encrypted_password", "email_confirmed_at", "invited_at", "confirmation_token", "confirmation_sent_at", "recovery_token", "recovery_sent_at", "email_change_token_new", "email_change", "email_change_sent_at", "last_sign_in_at", "raw_app_meta_data", "raw_user_meta_data", "is_super_admin", "created_at", "updated_at", "phone", "phone_confirmed_at", "phone_change", "phone_change_token", "phone_change_sent_at", "email_change_token_current", "email_change_confirm_status", "banned_until", "reauthentication_token", "reauthentication_sent_at", "is_sso_user", "deleted_at", "is_anonymous") VALUES
	('00000000-0000-0000-0000-000000000000', '6b59ef6a-a276-4d89-8006-4820334b4d12', 'authenticated', 'authenticated', 'dj@2nyt.com', '$2a$10$Q8dUin7q6eFvBwYNDP9pTOL8GnA..vATZEXTMMMYAlbqCUkc.lyY6', '2026-04-23 14:36:05.745959+00', NULL, '', NULL, '', '2026-04-29 17:07:08.925865+00', '', '', NULL, '2026-04-29 17:07:09.745274+00', '{"provider": "email", "providers": ["email"]}', '{"sub": "6b59ef6a-a276-4d89-8006-4820334b4d12", "email": "dj@2nyt.com", "full_name": "dj@2nyt.com", "email_verified": true, "phone_verified": false}', NULL, '2026-04-17 16:03:24.480407+00', '2026-04-29 17:07:09.766974+00', NULL, NULL, '', '', NULL, '', 0, NULL, '', NULL, false, NULL, false),
	('00000000-0000-0000-0000-000000000000', '3d238b4e-089e-42c4-9678-a3d43c54339e', 'authenticated', 'authenticated', 'bartender@2nyt.com', '$2a$10$gbbvbxrsEbQnRw/NgO7v2e6dfMCohztAEL5mK6noUrhGPZiwYuKXG', '2026-04-13 02:43:29.784248+00', NULL, '', NULL, '', '2026-04-29 17:07:20.976682+00', '', '', NULL, '2026-04-29 17:07:21.610541+00', '{"provider": "email", "providers": ["email"]}', '{"sub": "3d238b4e-089e-42c4-9678-a3d43c54339e", "email": "bartender@2nyt.com", "full_name": "Bartender", "email_verified": false, "phone_verified": false}', NULL, '2026-04-13 02:40:10.632238+00', '2026-04-29 17:07:21.612408+00', NULL, NULL, '', '', NULL, '', 0, NULL, '', NULL, false, NULL, false),
	('00000000-0000-0000-0000-000000000000', 'bbc9e993-8262-45ce-9338-e8934c4e13d4', 'authenticated', 'authenticated', 'mail@mailmail.com', '$2a$10$SkF0vkSQp6TE1pRdGdpKyuuixIrttLWVdNryH3ohdshsDTsjvkgNq', '2026-03-20 13:49:22.814329+00', NULL, '', NULL, '', NULL, '', '', NULL, NULL, '{"provider": "email", "providers": ["email"]}', '{"full_name": "Neue", "email_verified": true}', NULL, '2026-03-20 13:49:22.772518+00', '2026-03-20 13:49:22.819644+00', NULL, NULL, '', '', NULL, '', 0, NULL, '', NULL, false, NULL, false),
	('00000000-0000-0000-0000-000000000000', 'd2e588d8-8067-4beb-b1fc-f2528961c9ab', 'authenticated', 'authenticated', 'housemom@2nyt.com', '$2a$10$LnImt3qx8jOdjbWuya1d2.f7KI4OhNJmSV/wvwiDGqWZ7ijZn6ype', '2026-03-29 15:45:39.999329+00', NULL, '', NULL, '', NULL, '', '', NULL, '2026-04-10 06:50:51.211212+00', '{"provider": "email", "providers": ["email"]}', '{"email_verified": true}', NULL, '2026-03-29 15:45:39.993124+00', '2026-04-10 06:50:51.235846+00', NULL, NULL, '', '', NULL, '', 0, NULL, '', NULL, false, NULL, false),
	('00000000-0000-0000-0000-000000000000', '0bb35f58-f193-4963-ab07-2a4f6fb2f23c', 'authenticated', 'authenticated', 'door@2nyt.com', '$2a$10$YTjgHGWIpoNlCdwe5f5./Oey9AU/2oIsSvynttNgIMXcFR4zOQLu6', '2026-03-29 15:45:00.698667+00', NULL, '', NULL, '', '2026-05-01 20:29:51.449148+00', '', '', NULL, '2026-05-01 20:29:52.049084+00', '{"provider": "email", "providers": ["email"]}', '{"email_verified": true}', NULL, '2026-03-29 15:45:00.687239+00', '2026-05-01 20:29:52.091389+00', NULL, NULL, '', '', NULL, '', 0, NULL, '', NULL, false, NULL, false),
	('00000000-0000-0000-0000-000000000000', '335adc9e-265a-43a5-a1c5-b097309553cf', 'authenticated', 'authenticated', 'mail@gmail.com', '$2a$10$aWTrN0upSAtD3uiXU36vuuk43Fkaaio0rmdkBhlRUuLRZYw/6Go.i', '2026-03-23 14:59:59.532726+00', NULL, '', NULL, '', NULL, '', '', NULL, NULL, '{"provider": "email", "providers": ["email"]}', '{"full_name": "Jim J", "email_verified": true}', NULL, '2026-03-23 14:59:59.498707+00', '2026-03-23 14:59:59.533733+00', NULL, NULL, '', '', NULL, '', 0, NULL, '', NULL, false, NULL, false),
	('00000000-0000-0000-0000-000000000000', '69d85e31-40b8-4366-b928-52f6f37fbd3b', 'authenticated', 'authenticated', 'manager@2nyt.com', '$2a$10$7V6MKM293/ar8D3Eljrx/OIiTmTMuPcxC.troZh9ytvT4OPKkPIn.', '2026-03-18 17:02:50.75654+00', NULL, '', NULL, '', NULL, '', '', NULL, '2026-04-20 16:16:53.946669+00', '{"provider": "email", "providers": ["email"]}', '{"email_verified": true}', NULL, '2026-03-18 17:02:50.750792+00', '2026-04-20 16:16:53.985754+00', NULL, NULL, '', '', NULL, '', 0, NULL, '', NULL, false, NULL, false),
	('00000000-0000-0000-0000-000000000000', '5545accd-e3b4-44f6-8d17-0a9e66407cd2', 'authenticated', 'authenticated', 'room@2nyt.com', '$2a$10$ob7ZdlDxENJDlPKmn79dtuMiz5gdbaJcWZycRhg7kNBIv/w30Jgxq', '2026-03-29 15:45:20.827547+00', NULL, '', NULL, '', NULL, '', '', NULL, '2026-04-21 17:06:24.953108+00', '{"provider": "email", "providers": ["email"]}', '{"email_verified": true}', NULL, '2026-03-29 15:45:20.819846+00', '2026-04-21 17:06:24.996132+00', NULL, NULL, '', '', NULL, '', 0, NULL, '', NULL, false, NULL, false),
	('00000000-0000-0000-0000-000000000000', 'f0b584d0-97d6-41e7-aefa-1596a174d15b', 'authenticated', 'authenticated', 'owner@2nyt.com', '$2a$10$pqMTqUv6OIBGJLLHyMhOQe3vjpErLnKk0PiPhWkzv6wNM30iK.y2W', '2026-03-29 15:44:39.691225+00', NULL, '', NULL, '', NULL, '', '', NULL, '2026-04-29 16:59:39.85252+00', '{"provider": "email", "providers": ["email"]}', '{"email_verified": true}', NULL, '2026-03-29 15:44:39.678234+00', '2026-04-29 16:59:39.862398+00', NULL, NULL, '', '', NULL, '', 0, NULL, '', NULL, false, NULL, false),
	('00000000-0000-0000-0000-000000000000', '37eb0c37-0e66-48ba-b3cb-eaec7d942b2d', 'authenticated', 'authenticated', 'admin@2nyt.com', '$2a$10$dD0/UyQfWZ0lAUqB9KRbKeHp24WhBu1Dmero0tdQkjMbkPzYHgTeO', '2026-03-18 17:02:40.593468+00', NULL, '', NULL, '89e0faba585a2115a20c2499d536995a59d59c5160218b999a0277a2', '2026-04-05 08:19:40.238858+00', '', '', NULL, '2026-04-29 17:02:51.433603+00', '{"provider": "email", "providers": ["email"]}', '{"email_verified": true}', NULL, '2026-03-18 17:02:40.49616+00', '2026-04-29 17:02:51.494556+00', NULL, NULL, '', '', NULL, '', 0, NULL, '', NULL, false, NULL, false);


--
-- Data for Name: identities; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

INSERT INTO "auth"."identities" ("provider_id", "user_id", "identity_data", "provider", "last_sign_in_at", "created_at", "updated_at", "id") VALUES
	('37eb0c37-0e66-48ba-b3cb-eaec7d942b2d', '37eb0c37-0e66-48ba-b3cb-eaec7d942b2d', '{"sub": "37eb0c37-0e66-48ba-b3cb-eaec7d942b2d", "email": "admin@2nyt.com", "email_verified": false, "phone_verified": false}', 'email', '2026-03-18 17:02:40.551368+00', '2026-03-18 17:02:40.55143+00', '2026-03-18 17:02:40.55143+00', 'fdc76b83-bffe-4474-bbbf-f439e5638446'),
	('69d85e31-40b8-4366-b928-52f6f37fbd3b', '69d85e31-40b8-4366-b928-52f6f37fbd3b', '{"sub": "69d85e31-40b8-4366-b928-52f6f37fbd3b", "email": "manager@2nyt.com", "email_verified": false, "phone_verified": false}', 'email', '2026-03-18 17:02:50.755292+00', '2026-03-18 17:02:50.755341+00', '2026-03-18 17:02:50.755341+00', 'ccba8880-432a-4211-b112-0bb8cadf4e7a'),
	('bbc9e993-8262-45ce-9338-e8934c4e13d4', 'bbc9e993-8262-45ce-9338-e8934c4e13d4', '{"sub": "bbc9e993-8262-45ce-9338-e8934c4e13d4", "email": "mail@mailmail.com", "email_verified": false, "phone_verified": false}', 'email', '2026-03-20 13:49:22.803247+00', '2026-03-20 13:49:22.803639+00', '2026-03-20 13:49:22.803639+00', 'c062c864-7293-4d7a-8c5c-7390ff009e12'),
	('335adc9e-265a-43a5-a1c5-b097309553cf', '335adc9e-265a-43a5-a1c5-b097309553cf', '{"sub": "335adc9e-265a-43a5-a1c5-b097309553cf", "email": "mail@gmail.com", "email_verified": false, "phone_verified": false}', 'email', '2026-03-23 14:59:59.522323+00', '2026-03-23 14:59:59.522379+00', '2026-03-23 14:59:59.522379+00', '18233985-805e-439c-b609-08637dd4bc0c'),
	('f0b584d0-97d6-41e7-aefa-1596a174d15b', 'f0b584d0-97d6-41e7-aefa-1596a174d15b', '{"sub": "f0b584d0-97d6-41e7-aefa-1596a174d15b", "email": "owner@2nyt.com", "email_verified": false, "phone_verified": false}', 'email', '2026-03-29 15:44:39.685561+00', '2026-03-29 15:44:39.685619+00', '2026-03-29 15:44:39.685619+00', '41b38477-ea64-490e-a698-f5f7fa656db6'),
	('0bb35f58-f193-4963-ab07-2a4f6fb2f23c', '0bb35f58-f193-4963-ab07-2a4f6fb2f23c', '{"sub": "0bb35f58-f193-4963-ab07-2a4f6fb2f23c", "email": "door@2nyt.com", "email_verified": false, "phone_verified": false}', 'email', '2026-03-29 15:45:00.696713+00', '2026-03-29 15:45:00.696765+00', '2026-03-29 15:45:00.696765+00', 'f59d64fe-7616-429e-80a2-291ff799e449'),
	('5545accd-e3b4-44f6-8d17-0a9e66407cd2', '5545accd-e3b4-44f6-8d17-0a9e66407cd2', '{"sub": "5545accd-e3b4-44f6-8d17-0a9e66407cd2", "email": "room@2nyt.com", "email_verified": false, "phone_verified": false}', 'email', '2026-03-29 15:45:20.823998+00', '2026-03-29 15:45:20.824433+00', '2026-03-29 15:45:20.824433+00', '2523eb3d-bec8-4d19-9043-22c8897786f9'),
	('d2e588d8-8067-4beb-b1fc-f2528961c9ab', 'd2e588d8-8067-4beb-b1fc-f2528961c9ab', '{"sub": "d2e588d8-8067-4beb-b1fc-f2528961c9ab", "email": "housemom@2nyt.com", "email_verified": false, "phone_verified": false}', 'email', '2026-03-29 15:45:39.994901+00', '2026-03-29 15:45:39.994947+00', '2026-03-29 15:45:39.994947+00', '514e996e-1d29-48b9-b898-ba2e4c9e9971'),
	('3d238b4e-089e-42c4-9678-a3d43c54339e', '3d238b4e-089e-42c4-9678-a3d43c54339e', '{"sub": "3d238b4e-089e-42c4-9678-a3d43c54339e", "email": "bartender@2nyt.com", "full_name": "Bartender", "email_verified": false, "phone_verified": false}', 'email', '2026-04-13 02:40:10.672404+00', '2026-04-13 02:40:10.672452+00', '2026-04-13 02:40:10.672452+00', 'ecb23b90-07eb-4d7e-be61-bf713b80312c'),
	('6b59ef6a-a276-4d89-8006-4820334b4d12', '6b59ef6a-a276-4d89-8006-4820334b4d12', '{"sub": "6b59ef6a-a276-4d89-8006-4820334b4d12", "email": "dj@2nyt.com", "full_name": "dj@2nyt.com", "email_verified": false, "phone_verified": false}', 'email', '2026-04-17 16:03:24.544958+00', '2026-04-17 16:03:24.545016+00', '2026-04-17 16:03:24.545016+00', 'bf0ee14c-3141-466d-9334-6254e5e180d1');


--
-- Data for Name: instances; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: oauth_clients; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: sessions; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

INSERT INTO "auth"."sessions" ("id", "user_id", "created_at", "updated_at", "factor_id", "aal", "not_after", "refreshed_at", "user_agent", "ip", "tag", "oauth_client_id", "refresh_token_hmac_key", "refresh_token_counter", "scopes") VALUES
	('9b9484c4-bb4f-4d1b-a782-ac46b2303bd2', 'f0b584d0-97d6-41e7-aefa-1596a174d15b', '2026-04-29 16:59:39.852654+00', '2026-04-29 16:59:39.852654+00', NULL, 'aal1', NULL, NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36', '152.59.120.147', NULL, NULL, NULL, NULL, NULL),
	('58c26efc-2d3b-4c3a-ae7b-2685fd13ab25', 'f0b584d0-97d6-41e7-aefa-1596a174d15b', '2026-04-27 14:58:56.127252+00', '2026-04-27 17:39:34.644066+00', NULL, 'aal1', NULL, '2026-04-27 17:39:34.643966', 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Mobile Safari/537.36', '106.192.0.90', NULL, NULL, NULL, NULL, NULL);


--
-- Data for Name: mfa_amr_claims; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

INSERT INTO "auth"."mfa_amr_claims" ("session_id", "created_at", "updated_at", "authentication_method", "id") VALUES
	('9b9484c4-bb4f-4d1b-a782-ac46b2303bd2', '2026-04-29 16:59:39.863592+00', '2026-04-29 16:59:39.863592+00', 'password', '365162b0-5ac1-4c31-b619-ce98f630be77'),
	('58c26efc-2d3b-4c3a-ae7b-2685fd13ab25', '2026-04-27 14:58:56.185521+00', '2026-04-27 14:58:56.185521+00', 'password', 'f55bf97f-95b4-4a61-b68a-ca2f2e0f2b9b');


--
-- Data for Name: mfa_factors; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: mfa_challenges; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: oauth_authorizations; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: oauth_client_states; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: oauth_consents; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: one_time_tokens; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

INSERT INTO "auth"."one_time_tokens" ("id", "user_id", "token_type", "token_hash", "relates_to", "created_at", "updated_at") VALUES
	('d372a448-5a57-47d6-8036-c58c19f120c7', '37eb0c37-0e66-48ba-b3cb-eaec7d942b2d', 'recovery_token', '89e0faba585a2115a20c2499d536995a59d59c5160218b999a0277a2', 'admin@2nyt.com', '2026-04-05 08:19:41.590801', '2026-04-05 08:19:41.590801');


--
-- Data for Name: refresh_tokens; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

INSERT INTO "auth"."refresh_tokens" ("instance_id", "id", "token", "user_id", "revoked", "created_at", "updated_at", "parent", "session_id") VALUES
	('00000000-0000-0000-0000-000000000000', 1103, 'osbmgur5apky', 'f0b584d0-97d6-41e7-aefa-1596a174d15b', true, '2026-04-27 14:58:56.159677+00', '2026-04-27 17:39:34.606364+00', NULL, '58c26efc-2d3b-4c3a-ae7b-2685fd13ab25'),
	('00000000-0000-0000-0000-000000000000', 1108, 'x4gp7v2mew3w', 'f0b584d0-97d6-41e7-aefa-1596a174d15b', false, '2026-04-27 17:39:34.627477+00', '2026-04-27 17:39:34.627477+00', 'osbmgur5apky', '58c26efc-2d3b-4c3a-ae7b-2685fd13ab25'),
	('00000000-0000-0000-0000-000000000000', 1126, '3dwhgmiozwmr', 'f0b584d0-97d6-41e7-aefa-1596a174d15b', false, '2026-04-29 16:59:39.858666+00', '2026-04-29 16:59:39.858666+00', NULL, '9b9484c4-bb4f-4d1b-a782-ac46b2303bd2');


--
-- Data for Name: sso_providers; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: saml_providers; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: saml_relay_states; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: sso_domains; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: webauthn_challenges; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: webauthn_credentials; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: dancers; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: attendance_log; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: behaviour_notes; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: bottle_service; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: club_settings; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."club_settings" ("id", "song_price", "default_door_fee", "default_dancer_entrance_fee", "default_dancer_payout_pct", "updated_at", "report_email", "daily_report_enabled", "weekly_report_enabled", "open_time", "leave_cutoff_time", "day_reset_time", "late_arrival_time") VALUES
	('abd18da2-6aa2-43ac-ad3e-bdf12bdd4a2c', 50.00, 20.00, 50.00, 30.00, '2026-04-27 14:51:27.879056+00', NULL, true, true, '18:00:00', '00:00:00', '06:00:00', '20:30:00');


--
-- Data for Name: clubs; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: entry_tiers; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."entry_tiers" ("id", "name", "price", "description", "requires_distributor", "admits_count", "sort_order", "is_active", "created_at") VALUES
	('097debbe-dd78-46d5-8f37-c2d3d363acb0', 'Full Cover', 10.00, 'Default for most customers', false, 1, 1, true, '2026-04-02 04:08:11.58296+00'),
	('beeb8c85-90cd-46f7-9044-b3e2b33435ae', 'Reduced Cover', 5.00, 'Local/frequent visitors', false, 1, 2, true, '2026-04-02 04:08:11.58296+00'),
	('154fa3bb-27c2-489f-846f-3cbf94ef98a0', 'VIP', 0.00, 'Big-spending/high-value guests', false, 1, 3, true, '2026-04-02 04:08:11.58296+00'),
	('5b43efc4-e15e-4c55-b1ae-126f5f544884', 'CCC Card', 0.00, 'Promo cards distributed to local businesses', false, 1, 4, true, '2026-04-02 04:08:11.58296+00'),
	('5df6e8f0-4ba5-4599-a8fa-41951f0e0447', '2-for-1 Card', 10.00, 'One payment, two people enter', true, 2, 5, true, '2026-04-02 04:08:11.58296+00');


--
-- Data for Name: vendors; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."vendors" ("id", "name", "contact_name", "phone", "email", "commission_rate", "is_active", "notes", "created_at") VALUES
	('2bfd4bb2-fa3c-4297-b5fa-59b227239fc0', 'anil', 'bik', '52555', NULL, 9.00, false, NULL, '2026-04-08 16:01:54.047423+00'),
	('ab1c015b-5919-4e6d-8b5f-86eb5c0c8ba7', 'Mike Janson', 'Mika Lal', NULL, NULL, 0.00, false, NULL, '2026-04-06 14:54:43.431715+00');


--
-- Data for Name: customer_entries; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."customer_entries" ("id", "entry_time", "door_fee", "shift_date", "logged_by", "vendor_id", "entry_tier_id", "guest_count", "vendor_name") VALUES
	('ce6c327f-8e46-49f1-87ed-0f2352af1a85', '2026-05-01 16:22:36.988173+00', 0.00, '2026-05-01', '0bb35f58-f193-4963-ab07-2a4f6fb2f23c', NULL, '154fa3bb-27c2-489f-846f-3cbf94ef98a0', 1, NULL),
	('81cc5089-9f11-49ec-b265-06cb4e2184d1', '2026-05-01 16:23:08.837805+00', 0.00, '2026-05-01', '0bb35f58-f193-4963-ab07-2a4f6fb2f23c', NULL, '5b43efc4-e15e-4c55-b1ae-126f5f544884', 1, NULL),
	('6e26b4e9-b1be-4013-9185-8e9fdafb7dc1', '2026-05-01 20:30:05.709603+00', 0.00, '2026-05-01', '0bb35f58-f193-4963-ab07-2a4f6fb2f23c', NULL, '154fa3bb-27c2-489f-846f-3cbf94ef98a0', 10, NULL);


--
-- Data for Name: dance_tiers; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."dance_tiers" ("id", "name", "price", "house_pct", "dancer_pct", "duration_seconds", "is_custom", "is_active", "sort_order", "created_at", "duration_minutes") VALUES
	('dc93bdc0-e73f-433f-84bf-e3e90e1d6e61', 'Stage', 20.00, 70.00, 30.00, NULL, false, true, 5, '2026-04-02 04:08:11.58296+00', NULL),
	('422958bf-9e4d-4ae8-ad8c-e52bbff3d95e', 'Custom', 0.00, 70.00, 30.00, NULL, true, true, 6, '2026-04-02 04:08:11.58296+00', NULL),
	('27ccb8df-61b1-4c56-88b1-15e538f1b927', '1 Lap', 30.00, 70.00, 30.00, NULL, false, true, 1, '2026-04-02 04:08:11.58296+00', 3),
	('559364e6-7021-4c8a-a54f-be43e7ba78eb', '3 Laps', 90.00, 70.00, 30.00, NULL, false, true, 2, '2026-04-02 04:08:11.58296+00', 9),
	('d5e5a9a0-eb81-4318-956b-150ab5a14b38', '15 Min', 140.00, 70.00, 30.00, 900, false, true, 3, '2026-04-02 04:08:11.58296+00', 15),
	('d2957c93-1f9a-4ad5-9195-bdac8627092d', '30 Min', 250.00, 70.00, 30.00, 1800, false, true, 4, '2026-04-02 04:08:11.58296+00', 30);


--
-- Data for Name: distributors; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: dance_sessions; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: dancer_ban_log; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: dancer_event_log; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: dancer_stage_names; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: early_leave_codes; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: guests; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: guest_visits; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: kiosk_sessions; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."kiosk_sessions" ("id", "session_token", "user_id", "role", "path", "user_agent", "last_seen", "created_at", "status", "locked_at") VALUES
	('85b1e29e-8db6-490b-bc7a-ccec9822b4ac', 'b795f2cb-fa5b-4c93-ac6d-2841f0cc4ea8', '5545accd-e3b4-44f6-8d17-0a9e66407cd2', 'room_attendant', '/rooms', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36', '2026-04-10 07:51:43.092+00', '2026-04-10 05:54:35.549145+00', 'active', NULL),
	('db669538-5976-4205-a567-994cf2d4c7a9', '6a5d75a0-206c-4374-a1f9-46128737aeb4', '0bb35f58-f193-4963-ab07-2a4f6fb2f23c', 'door_staff', '/door', 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Mobile Safari/537.36', '2026-04-07 17:19:50.992+00', '2026-04-07 16:48:11.899138+00', 'active', NULL),
	('85bcab5d-ee90-43a9-8d3e-82cd2cb7f67e', '35a9de67-0b34-4131-9981-ef41f03db045', '37eb0c37-0e66-48ba-b3cb-eaec7d942b2d', 'admin', '/dashboard', 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Mobile Safari/537.36', '2026-04-28 19:33:30.415+00', '2026-04-07 03:59:12.381956+00', 'active', NULL),
	('e67d3e89-250e-4d1d-b97a-6eb8db84785b', '846a3a02-77a6-43c6-99c8-2573cdae922a', '37eb0c37-0e66-48ba-b3cb-eaec7d942b2d', 'admin', '/dashboard', 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.3 Mobile/15E148 Safari/604.1', '2026-04-15 10:06:11.573+00', '2026-04-15 10:05:00.708063+00', 'active', NULL),
	('ae9e89c9-06d5-4d4f-9dfe-8655efdaf371', 'f7161846-fcc3-4775-bbcf-619a264b993a', '37eb0c37-0e66-48ba-b3cb-eaec7d942b2d', 'admin', '/kiosks', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36', '2026-04-10 06:07:14.471+00', '2026-04-08 15:26:43.860053+00', 'active', NULL),
	('25e9e43b-13ae-4225-bd0c-5690272656d2', 'a34114f2-ecf8-4d0a-8325-968fdb908d48', '37eb0c37-0e66-48ba-b3cb-eaec7d942b2d', 'admin', '/dashboard', 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.7.5 Mobile/15E148 Safari/604.1', '2026-04-15 09:53:04.708+00', '2026-04-15 09:51:35.337828+00', 'active', NULL),
	('064065dd-9272-450c-aacb-596f886a4cc9', 'e96c38ae-00fe-4d4d-9302-e3dcd3db0b36', '37eb0c37-0e66-48ba-b3cb-eaec7d942b2d', 'admin', '/kiosks', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36', '2026-04-08 16:05:05.719+00', '2026-04-08 15:59:13.109875+00', 'active', NULL),
	('89736ef7-31d7-49d1-a1fd-0228621cf8fe', '5ceba4c2-d4ed-4a19-897a-c84d09fd89f9', '37eb0c37-0e66-48ba-b3cb-eaec7d942b2d', 'admin', '/dancers', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36', '2026-04-07 14:36:49.508+00', '2026-04-07 14:23:40.352763+00', 'active', NULL),
	('fe87df92-c5df-459b-85cf-4be130ae778f', 'e9ae0429-4a67-4b50-9e59-d814191880a9', '37eb0c37-0e66-48ba-b3cb-eaec7d942b2d', 'admin', '/settings', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36', '2026-04-11 13:43:48.95+00', '2026-04-07 16:43:40.676524+00', 'active', NULL),
	('af68fcb3-db8d-482c-9075-dc60adfa22b0', '468ac405-ac26-4d99-92a5-49de9415af11', '37eb0c37-0e66-48ba-b3cb-eaec7d942b2d', 'admin', '/kiosks', 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Mobile Safari/537.36 OPR/96.0.0.0', '2026-04-08 15:06:51.75+00', '2026-04-08 15:04:16.433097+00', 'active', NULL),
	('cc2b9044-351a-446e-ba26-85bef95a3f45', '75dccd11-02a0-46aa-a68c-e7cc08999a67', '37eb0c37-0e66-48ba-b3cb-eaec7d942b2d', 'admin', '/dashboard', 'Mozilla/5.0 (Linux; Android 11; RMP2102 Build/RP1A.200720.011; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/146.0.7680.178 Safari/537.36', '2026-04-14 10:11:30.674+00', '2026-04-14 03:47:51.585905+00', 'active', NULL),
	('97c470e2-d98d-4634-a706-535fe44e9c07', '16cd8adc-8141-4ea2-acb9-073ab4687889', '37eb0c37-0e66-48ba-b3cb-eaec7d942b2d', 'admin', '/logs', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36', '2026-04-13 03:15:36.42+00', '2026-04-13 02:12:27.06274+00', 'active', NULL),
	('1a8b9dc6-f9b6-435d-864a-bae2145dc91b', '0ecc0e88-50d3-41c6-b59a-6ba8657b1cef', '37eb0c37-0e66-48ba-b3cb-eaec7d942b2d', 'admin', '/door', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36', '2026-04-27 15:34:26.171+00', '2026-04-06 16:34:17.347034+00', 'active', NULL),
	('92bb2b10-a3ba-4c53-a2a3-e174692f3213', '5e9b783c-1a72-4e1e-b8e7-fd1a4b7457e8', '37eb0c37-0e66-48ba-b3cb-eaec7d942b2d', 'admin', '/logs', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36', '2026-04-16 14:12:39.208+00', '2026-04-16 14:06:47.910327+00', 'active', NULL),
	('c1341fd7-ff85-4ac0-831e-f3d92006eb85', '0db597c6-5ddd-4694-8c93-b7bcaba957af', '37eb0c37-0e66-48ba-b3cb-eaec7d942b2d', 'admin', '/settings', 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_6_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.6 Mobile/15E148 Safari/604.1', '2026-04-08 20:43:20.907+00', '2026-04-08 20:41:29.398111+00', 'active', NULL),
	('3f508184-255f-4810-ae4f-1d742b1de259', '0ddff65e-cf63-4a37-895a-0b8565bc1e06', '37eb0c37-0e66-48ba-b3cb-eaec7d942b2d', 'admin', '/settings', 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Mobile Safari/537.36', '2026-04-20 16:16:29.452+00', '2026-04-10 03:01:10.31181+00', 'active', NULL),
	('45a18f2a-e68b-409f-928a-b53ef21e3df5', 'cd7e7f95-8c23-4073-bcf2-2e34ef67970f', '37eb0c37-0e66-48ba-b3cb-eaec7d942b2d', 'admin', '/dashboard', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36', '2026-04-13 16:11:18.194+00', '2026-04-07 06:30:53.029018+00', 'active', NULL),
	('16b1eb43-52e6-467f-bea5-83a691167f31', '95316261-0754-4169-b9bc-32e556fe7a8a', '37eb0c37-0e66-48ba-b3cb-eaec7d942b2d', 'admin', '/dashboard', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36', '2026-04-29 16:45:33.45+00', '2026-04-07 14:32:50.603054+00', 'active', NULL),
	('0a320680-a956-44a2-92b8-b7e4855e8d03', '4d83a4ec-aa4f-4846-a177-bfe7e8198239', '0bb35f58-f193-4963-ab07-2a4f6fb2f23c', 'door_staff', '/door', 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36 OPR/91.0.0.0', '2026-04-14 03:57:19.949+00', '2026-04-14 03:56:05.265695+00', 'active', NULL),
	('1324422e-9344-4ae8-b4bc-d9570559a0d2', '9dce2c55-6b3c-4bec-bc4b-490b1a9178bd', '0bb35f58-f193-4963-ab07-2a4f6fb2f23c', 'door_staff', '/door', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36', '2026-04-29 16:53:30.717+00', '2026-04-29 16:53:31.522525+00', 'active', NULL),
	('9fec020a-7635-457e-9103-6de2db7c3a64', '4f08b6f1-5c59-412f-ac4e-53f7ec27a374', '37eb0c37-0e66-48ba-b3cb-eaec7d942b2d', 'admin', '/door', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36', '2026-04-27 15:19:13.663+00', '2026-04-27 14:35:19.590088+00', 'active', NULL),
	('470ce627-1911-48f9-8c74-4a45680c4091', '31c6b7b2-dd02-4be9-a9e2-0066ed7073b3', '0bb35f58-f193-4963-ab07-2a4f6fb2f23c', 'door_staff', '/door', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36', '2026-04-27 15:51:35.536+00', '2026-04-27 15:08:51.520619+00', 'active', NULL),
	('51423893-5f1d-41ce-8c4b-0d71e7e855b9', '25295b78-a83f-4e11-b452-53c926caf306', 'f0b584d0-97d6-41e7-aefa-1596a174d15b', 'owner', '/settings', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36', '2026-04-20 03:53:43.098+00', '2026-04-20 02:26:36.787247+00', 'active', NULL),
	('7134ad2b-ff89-48d4-b088-d40b58d76fd1', 'c81f0414-4342-4795-b534-435f5aa1d590', '37eb0c37-0e66-48ba-b3cb-eaec7d942b2d', 'admin', '/dashboard', 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36', '2026-04-19 13:23:42.481+00', '2026-04-19 12:57:19.962295+00', 'active', NULL),
	('a3670439-dd6d-4560-9996-ffdd166721c0', '11571d6e-c689-4f7b-b802-b2b979395ec7', 'f0b584d0-97d6-41e7-aefa-1596a174d15b', 'owner', '/door', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.3 Safari/605.1.15', '2026-04-21 16:00:40.738+00', '2026-04-18 15:33:19.213523+00', 'active', NULL),
	('7585fd95-e2ed-4eb1-be8e-988449af4cbc', 'cafadd6b-d227-410b-97e8-f75c779c347c', '37eb0c37-0e66-48ba-b3cb-eaec7d942b2d', 'admin', '/settings', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36', '2026-04-29 17:06:57.53+00', '2026-04-29 16:57:18.922234+00', 'active', NULL),
	('16bf1872-571b-4903-a17a-4261dc28958f', '7b353541-e127-4c95-ba8e-d9e3ea6b9a71', '37eb0c37-0e66-48ba-b3cb-eaec7d942b2d', 'admin', '/dashboard', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36', '2026-04-29 16:18:16.465+00', '2026-04-29 16:01:04.489718+00', 'active', NULL),
	('62f746c3-008f-45d2-a501-ef7e66016c60', '89d5c4b9-d4a8-4046-9553-c11855d39278', '0bb35f58-f193-4963-ab07-2a4f6fb2f23c', 'door_staff', '/door', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36', '2026-05-01 16:47:34.412+00', '2026-05-01 16:20:20.63778+00', 'active', NULL),
	('e4406f59-1964-4c0e-9fd1-04b7312f827d', '6373a012-bf52-4196-b0f8-df435d4cea41', '0bb35f58-f193-4963-ab07-2a4f6fb2f23c', 'door_staff', '/door', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36', '2026-05-01 20:45:07.29+00', '2026-05-01 20:29:53.232288+00', 'active', NULL);


--
-- Data for Name: payment_history; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: profiles; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."profiles" ("id", "user_id", "full_name", "pin_code", "employee_id", "is_active", "created_at", "updated_at") VALUES
	('68f91b1c-0267-4b7e-b64b-51a066a6425b', '37eb0c37-0e66-48ba-b3cb-eaec7d942b2d', 'admin@2nyt.com', NULL, NULL, true, '2026-03-18 17:02:40.493601+00', '2026-03-18 17:02:40.493601+00'),
	('17027652-eec9-4f36-87c0-511baac6bf9a', '335adc9e-265a-43a5-a1c5-b097309553cf', 'Jim J', NULL, NULL, false, '2026-03-23 14:59:59.498378+00', '2026-04-08 15:26:58.089082+00'),
	('2b033e33-4cee-492c-8d0c-6a83aea9dcee', 'bbc9e993-8262-45ce-9338-e8934c4e13d4', 'Neue', NULL, NULL, false, '2026-03-20 13:49:22.770511+00', '2026-04-08 15:26:59.080516+00'),
	('cf1c32a1-6ed9-4c6b-8cb8-c1800a48206c', '0bb35f58-f193-4963-ab07-2a4f6fb2f23c', 'door@2nyt.com', '1234', NULL, true, '2026-03-29 15:45:00.685685+00', '2026-04-10 03:03:41.117251+00'),
	('c9edd9b4-29b6-4df8-8f10-a37acee627b4', '69d85e31-40b8-4366-b928-52f6f37fbd3b', 'manager@2nyt.com', NULL, NULL, true, '2026-03-18 17:02:50.749876+00', '2026-04-20 16:16:35.281676+00'),
	('c4b17fc9-c19f-459c-8efb-3eb551ed0392', 'f0b584d0-97d6-41e7-aefa-1596a174d15b', 'owner@2nyt.com', NULL, NULL, true, '2026-03-29 15:44:39.676768+00', '2026-04-29 16:59:58.947474+00'),
	('e157b139-fe11-43c6-bab5-bd6fbfe27d94', 'd2e588d8-8067-4beb-b1fc-f2528961c9ab', 'housemom@2nyt.com', NULL, NULL, false, '2026-03-29 15:45:39.99166+00', '2026-04-29 17:03:07.832867+00'),
	('771c664d-f5d5-45c6-a214-d57eb1c898f0', '5545accd-e3b4-44f6-8d17-0a9e66407cd2', 'room@2nyt.com', '5678', NULL, true, '2026-03-29 15:45:20.817595+00', '2026-04-29 17:04:26.360353+00'),
	('42c1f289-5dad-46f6-a70f-a52b976cfa62', '6b59ef6a-a276-4d89-8006-4820334b4d12', 'dj@2nyt.com', '2005', NULL, true, '2026-04-17 16:03:24.479215+00', '2026-04-29 17:05:25.768464+00'),
	('d57491df-fed8-49b6-b01e-73bc4a17ca10', '3d238b4e-089e-42c4-9678-a3d43c54339e', 'bartender@2nyt.com', '3050', NULL, true, '2026-04-13 02:40:10.631117+00', '2026-04-29 17:06:17.181404+00');


--
-- Data for Name: promo_codes; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."promo_codes" ("id", "code", "label", "entry_tier_id", "vendor_id", "max_uses", "use_count", "is_active", "created_by", "created_at") VALUES
	('75ded980-115c-4576-a839-2802b7f2dad5', 'MIKE2F1', NULL, '5df6e8f0-4ba5-4599-a8fa-41951f0e0447', 'ab1c015b-5919-4e6d-8b5f-86eb5c0c8ba7', 5, 0, true, '37eb0c37-0e66-48ba-b3cb-eaec7d942b2d', '2026-04-06 16:22:54.216681+00'),
	('81b86c93-6adf-45ca-855c-0cd5da87ed06', 'GTEGGGDD', 'anil', '5df6e8f0-4ba5-4599-a8fa-41951f0e0447', NULL, 1, 0, true, '37eb0c37-0e66-48ba-b3cb-eaec7d942b2d', '2026-04-08 15:52:45.105358+00'),
	('f90424e6-b7a3-4ef6-8435-b4b0e6ceebea', '26561', 'sda', '5df6e8f0-4ba5-4599-a8fa-41951f0e0447', '2bfd4bb2-fa3c-4297-b5fa-59b227239fc0', 1, 0, true, '37eb0c37-0e66-48ba-b3cb-eaec7d942b2d', '2026-04-08 16:02:27.138924+00');


--
-- Data for Name: promo_redemptions; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: room_sessions; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: staff_attendance; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."staff_attendance" ("id", "profile_id", "role", "shift_date", "clock_in", "clock_out", "created_at") VALUES
	('7a29b280-9b6e-4e98-aa63-37fd1dc7bc6a', 'cf1c32a1-6ed9-4c6b-8cb8-c1800a48206c', 'door_staff', '2026-04-23', '2026-04-23 14:23:49.958+00', '2026-04-23 14:25:54.543+00', '2026-04-23 14:23:50.227033+00'),
	('32011f38-8da3-46de-9631-7564343ca487', 'cf1c32a1-6ed9-4c6b-8cb8-c1800a48206c', 'door_staff', '2026-04-23', '2026-04-23 14:24:06.027+00', '2026-04-23 14:25:54.543+00', '2026-04-23 14:24:06.224085+00'),
	('c367641e-cd08-4282-9d6f-6f861638fe5e', 'd57491df-fed8-49b6-b01e-73bc4a17ca10', 'bartender', '2026-04-23', '2026-04-23 14:26:25.354+00', NULL, '2026-04-23 14:26:25.627164+00'),
	('c855b171-f78e-4f59-b033-4838780a29f1', 'd57491df-fed8-49b6-b01e-73bc4a17ca10', 'bartender', '2026-04-23', '2026-04-23 14:26:35.628+00', NULL, '2026-04-23 14:26:35.887515+00'),
	('58cae6be-c6ad-4b57-a45a-39a1b6d4f1c8', 'cf1c32a1-6ed9-4c6b-8cb8-c1800a48206c', 'door_staff', '2026-04-23', '2026-04-23 14:29:23.642+00', '2026-04-23 14:29:35.332+00', '2026-04-23 14:29:23.993057+00'),
	('40685a18-a69b-4701-b1da-2f53723a3b22', 'd57491df-fed8-49b6-b01e-73bc4a17ca10', 'bartender', '2026-04-23', '2026-04-23 14:29:40.832+00', NULL, '2026-04-23 14:29:41.066975+00'),
	('d87ff2e0-7ed5-4a87-a1ac-34c4fdeee0aa', '42c1f289-5dad-46f6-a70f-a52b976cfa62', 'dj', '2026-04-23', '2026-04-23 14:36:05.088+00', NULL, '2026-04-23 14:36:05.349228+00'),
	('2fb95b37-9500-4994-b4d8-49b75451a11d', 'cf1c32a1-6ed9-4c6b-8cb8-c1800a48206c', 'door_staff', '2026-04-23', '2026-04-23 14:39:47.481+00', '2026-04-23 15:09:47.769+00', '2026-04-23 14:39:47.723179+00'),
	('7273cdf6-45cf-467f-be15-09143bb5aa6e', 'cf1c32a1-6ed9-4c6b-8cb8-c1800a48206c', 'door_staff', '2026-04-23', '2026-04-23 14:43:32.715+00', '2026-04-23 15:09:47.769+00', '2026-04-23 14:43:32.894901+00'),
	('476e7c00-fab8-428b-96be-7db20b138cd8', 'cf1c32a1-6ed9-4c6b-8cb8-c1800a48206c', 'door_staff', '2026-04-23', '2026-04-23 14:44:21.594+00', '2026-04-23 15:09:47.769+00', '2026-04-23 14:44:21.75122+00'),
	('333f5ae8-709b-4511-85eb-754f960f3a5b', 'cf1c32a1-6ed9-4c6b-8cb8-c1800a48206c', 'door_staff', '2026-04-24', '2026-04-24 16:09:20.242+00', '2026-04-24 16:33:23.666+00', '2026-04-24 16:09:20.469087+00'),
	('d34cbcc6-fac1-4ada-8fae-70a6e8efde48', 'cf1c32a1-6ed9-4c6b-8cb8-c1800a48206c', 'door_staff', '2026-04-24', '2026-04-24 16:45:05.335+00', '2026-04-24 17:09:51.239+00', '2026-04-24 16:45:05.891336+00'),
	('df7b07ad-6922-4c21-b066-acd6156c5a4a', 'cf1c32a1-6ed9-4c6b-8cb8-c1800a48206c', 'door_staff', '2026-04-24', '2026-04-24 16:46:08.081+00', '2026-04-24 17:09:51.239+00', '2026-04-24 16:46:08.302188+00'),
	('e33916f9-f9be-4a77-80f2-3baa0b3ce04b', 'cf1c32a1-6ed9-4c6b-8cb8-c1800a48206c', 'door_staff', '2026-04-24', '2026-04-24 17:22:30.506+00', NULL, '2026-04-24 17:22:30.725068+00'),
	('3f4516c5-8108-4a91-b270-725b607cd3d0', 'cf1c32a1-6ed9-4c6b-8cb8-c1800a48206c', 'door_staff', '2026-04-24', '2026-04-24 17:24:53.214+00', NULL, '2026-04-24 17:24:53.790989+00'),
	('02a83ce4-3801-4ba7-8cd4-365ba1b3a4eb', 'cf1c32a1-6ed9-4c6b-8cb8-c1800a48206c', 'door_staff', '2026-04-25', '2026-04-25 05:27:36.555+00', '2026-04-25 05:52:47.743+00', '2026-04-25 05:27:36.803021+00'),
	('215f30fa-c5d5-442e-babe-3307686d56ab', 'cf1c32a1-6ed9-4c6b-8cb8-c1800a48206c', 'door_staff', '2026-04-26', '2026-04-26 02:52:00.194+00', '2026-04-26 02:56:23.031+00', '2026-04-26 02:52:00.4696+00'),
	('0c77f828-1f97-4ea1-9668-59ddf8fd9ac3', 'cf1c32a1-6ed9-4c6b-8cb8-c1800a48206c', 'door_staff', '2026-04-26', '2026-04-26 14:57:11.225+00', '2026-04-26 15:00:17.741+00', '2026-04-26 14:57:11.514547+00'),
	('7a02c8a7-0c65-44ba-905d-6cdedb7d1ffa', 'cf1c32a1-6ed9-4c6b-8cb8-c1800a48206c', 'door_staff', '2026-04-26', '2026-04-26 14:59:00.407+00', '2026-04-26 15:00:17.741+00', '2026-04-26 14:59:00.710375+00'),
	('d3614e48-3743-425b-a337-d33f43e71992', 'cf1c32a1-6ed9-4c6b-8cb8-c1800a48206c', 'door_staff', '2026-04-26', '2026-04-26 15:00:56.145+00', '2026-04-26 15:16:15.654+00', '2026-04-26 15:00:56.300815+00'),
	('b20d667f-0160-4065-9f2f-84c0d5db3d59', 'd57491df-fed8-49b6-b01e-73bc4a17ca10', 'bartender', '2026-04-27', '2026-04-27 03:03:35.518+00', NULL, '2026-04-27 03:03:35.835401+00'),
	('3462a0ee-fd3e-4a8f-b3cd-c39bf4852bbc', 'cf1c32a1-6ed9-4c6b-8cb8-c1800a48206c', 'door_staff', '2026-04-27', '2026-04-27 03:04:04.441+00', '2026-04-27 12:40:56.529+00', '2026-04-27 03:04:04.661603+00'),
	('5268a04b-e48d-47d8-8e1f-e4b09da0c89f', 'cf1c32a1-6ed9-4c6b-8cb8-c1800a48206c', 'door_staff', '2026-04-27', '2026-04-27 12:38:16.237+00', '2026-04-27 12:40:56.529+00', '2026-04-27 12:38:16.487347+00'),
	('45371cf7-3889-4daa-b3a3-2851ee066ea1', 'd57491df-fed8-49b6-b01e-73bc4a17ca10', 'bartender', '2026-04-27', '2026-04-27 12:42:27.192+00', NULL, '2026-04-27 12:42:27.549929+00'),
	('64bb407a-c172-4e94-b75e-c483f5b57497', 'cf1c32a1-6ed9-4c6b-8cb8-c1800a48206c', 'door_staff', '2026-04-27', '2026-04-27 13:47:48.245+00', '2026-04-27 13:55:19.709+00', '2026-04-27 13:47:48.546055+00'),
	('ec77b109-7cf2-4f5b-9864-26f013b54722', 'cf1c32a1-6ed9-4c6b-8cb8-c1800a48206c', 'door_staff', '2026-04-27', '2026-04-27 13:54:48.389+00', '2026-04-27 13:55:19.709+00', '2026-04-27 13:54:48.669819+00'),
	('72248acb-6cd8-4df5-89fb-c4e96a2eb411', '42c1f289-5dad-46f6-a70f-a52b976cfa62', 'dj', '2026-04-27', '2026-04-27 03:03:48.181+00', '2026-04-27 14:00:47.895+00', '2026-04-27 03:03:48.33338+00'),
	('6ca3bdc5-8561-4a25-8e67-1d20dbc2af10', '42c1f289-5dad-46f6-a70f-a52b976cfa62', 'dj', '2026-04-27', '2026-04-27 12:41:18.997+00', '2026-04-27 14:00:47.895+00', '2026-04-27 12:41:19.228317+00'),
	('9bddcc99-f974-4166-a492-b6780bb34701', '42c1f289-5dad-46f6-a70f-a52b976cfa62', 'dj', '2026-04-27', '2026-04-27 12:42:48.326+00', '2026-04-27 14:00:47.895+00', '2026-04-27 12:42:48.635493+00'),
	('03c320ab-548c-4177-a485-156e3912aee7', '42c1f289-5dad-46f6-a70f-a52b976cfa62', 'dj', '2026-04-27', '2026-04-27 13:55:27.154+00', '2026-04-27 14:00:47.895+00', '2026-04-27 13:55:27.314955+00'),
	('878e07f6-ed2b-465e-8d9d-36a98637ad27', 'cf1c32a1-6ed9-4c6b-8cb8-c1800a48206c', 'door_staff', '2026-04-27', '2026-04-27 14:00:55.063+00', '2026-04-27 14:19:10.425+00', '2026-04-27 14:00:55.334037+00'),
	('06f5d732-e5c9-480d-bccd-f5571548c732', 'cf1c32a1-6ed9-4c6b-8cb8-c1800a48206c', 'door_staff', '2026-04-27', '2026-04-27 14:19:24.869+00', '2026-04-27 14:19:34.258+00', '2026-04-27 14:19:25.058689+00'),
	('833ca1c9-91e8-4ea6-a1d6-c778ba259860', 'cf1c32a1-6ed9-4c6b-8cb8-c1800a48206c', 'door_staff', '2026-04-27', '2026-04-27 14:30:59.694+00', '2026-04-27 14:41:37.351+00', '2026-04-27 14:31:00.297197+00'),
	('7a9e344f-119c-467d-97ef-a8cb48ecf458', 'cf1c32a1-6ed9-4c6b-8cb8-c1800a48206c', 'door_staff', '2026-04-27', '2026-04-27 14:43:17.738+00', '2026-04-27 15:22:23.72+00', '2026-04-27 14:43:17.887819+00'),
	('ac08311f-d4a6-4b8b-a666-ed5d4b689b82', 'cf1c32a1-6ed9-4c6b-8cb8-c1800a48206c', 'door_staff', '2026-04-27', '2026-04-27 15:08:49.211+00', '2026-04-27 15:22:23.72+00', '2026-04-27 15:08:49.249105+00'),
	('af154137-e49f-40fa-8bbc-c9133bdb41bc', 'cf1c32a1-6ed9-4c6b-8cb8-c1800a48206c', 'door_staff', '2026-04-27', '2026-04-27 15:53:01.674+00', '2026-04-27 17:01:45.322+00', '2026-04-27 15:53:01.937089+00'),
	('05b8109e-d838-402c-8e44-12025d18ba70', 'cf1c32a1-6ed9-4c6b-8cb8-c1800a48206c', 'door_staff', '2026-04-27', '2026-04-27 16:38:08.934+00', '2026-04-27 17:01:45.322+00', '2026-04-27 16:38:09.210942+00'),
	('f3f5d5e1-8b56-4e99-8904-60e499dda8c0', 'cf1c32a1-6ed9-4c6b-8cb8-c1800a48206c', 'door_staff', '2026-04-27', '2026-04-27 16:49:47.485+00', '2026-04-27 17:01:45.322+00', '2026-04-27 16:49:47.796151+00'),
	('ff33365a-c948-4946-982e-d5c717b29e39', 'cf1c32a1-6ed9-4c6b-8cb8-c1800a48206c', 'door_staff', '2026-04-28', '2026-04-28 15:44:35.952+00', NULL, '2026-04-28 15:44:36.757869+00'),
	('c5c07ce2-8597-490e-8d93-fd9ced28fb6e', 'cf1c32a1-6ed9-4c6b-8cb8-c1800a48206c', 'door_staff', '2026-04-29', '2026-04-29 10:16:08.759+00', '2026-04-29 16:01:17.223+00', '2026-04-29 10:16:08.979678+00'),
	('4225f27d-4ca3-43a9-a1b7-c57d5a7bc16d', 'cf1c32a1-6ed9-4c6b-8cb8-c1800a48206c', 'door_staff', '2026-04-29', '2026-04-29 13:13:26.953+00', '2026-04-29 16:01:17.223+00', '2026-04-29 13:13:27.171291+00'),
	('eb45a0d9-48e9-4f7a-96e7-913fd64e7f37', 'cf1c32a1-6ed9-4c6b-8cb8-c1800a48206c', 'door_staff', '2026-04-29', '2026-04-29 16:00:59.993+00', '2026-04-29 16:01:17.223+00', '2026-04-29 16:01:01.122656+00'),
	('47961824-dcd2-41c9-875c-fd44ee633b05', 'cf1c32a1-6ed9-4c6b-8cb8-c1800a48206c', 'door_staff', '2026-04-29', '2026-04-29 16:18:25.276+00', '2026-04-29 16:18:45.641+00', '2026-04-29 16:18:25.447633+00'),
	('3bfd9c13-0e17-48e1-b7c3-d9bb221c04f9', 'cf1c32a1-6ed9-4c6b-8cb8-c1800a48206c', 'door_staff', '2026-04-29', '2026-04-29 16:38:03.64+00', '2026-04-29 16:38:13.779+00', '2026-04-29 16:38:03.869367+00'),
	('b95b380d-5a86-4c27-9567-4697edf4507d', 'cf1c32a1-6ed9-4c6b-8cb8-c1800a48206c', 'door_staff', '2026-04-29', '2026-04-29 16:45:50.061+00', '2026-04-29 16:53:36.583+00', '2026-04-29 16:45:50.374751+00'),
	('1aec69bd-c74e-4861-978d-c23db7c987c8', 'cf1c32a1-6ed9-4c6b-8cb8-c1800a48206c', 'door_staff', '2026-04-29', '2026-04-29 16:53:28.5+00', '2026-04-29 16:53:36.583+00', '2026-04-29 16:53:28.779883+00'),
	('0d9d0579-1527-42d2-a2bd-6bbbd3c223dd', 'cf1c32a1-6ed9-4c6b-8cb8-c1800a48206c', 'door_staff', '2026-04-29', '2026-04-29 16:57:16.927+00', '2026-04-29 16:57:22.491+00', '2026-04-29 16:57:17.18228+00'),
	('23533dd3-7d27-46bf-83c8-187bb945ca44', '42c1f289-5dad-46f6-a70f-a52b976cfa62', 'dj', '2026-04-29', '2026-04-29 17:07:09.122+00', '2026-04-29 17:07:13.807+00', '2026-04-29 17:07:09.330832+00'),
	('21469131-67e6-4b35-9a2e-4641982c3f99', 'd57491df-fed8-49b6-b01e-73bc4a17ca10', 'bartender', '2026-04-29', '2026-04-29 17:07:21.147+00', '2026-04-29 17:07:24.291+00', '2026-04-29 17:07:21.274893+00'),
	('681c6704-599e-4238-863d-1d755599a28a', 'cf1c32a1-6ed9-4c6b-8cb8-c1800a48206c', 'door_staff', '2026-04-29', '2026-04-29 17:07:33.375+00', '2026-04-29 17:07:39.059+00', '2026-04-29 17:07:33.513543+00'),
	('98c67d58-b7bc-4391-beb3-d215000b4acc', 'cf1c32a1-6ed9-4c6b-8cb8-c1800a48206c', 'door_staff', '2026-05-01', '2026-05-01 16:20:14.567+00', '2026-05-01 16:47:44.918+00', '2026-05-01 16:20:17.117676+00'),
	('d7d2697f-3f93-4f0d-b886-e5c0223762fa', 'cf1c32a1-6ed9-4c6b-8cb8-c1800a48206c', 'door_staff', '2026-05-01', '2026-05-01 20:29:51.54+00', '2026-05-01 20:45:21.765+00', '2026-05-01 20:29:51.613392+00');


--
-- Data for Name: stage_fines; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: stage_rotation; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: stage_sessions; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: transactions; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: user_roles; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."user_roles" ("id", "user_id", "role") VALUES
	('a8e75825-f812-4925-8088-cfc2d130525a', '37eb0c37-0e66-48ba-b3cb-eaec7d942b2d', 'admin'),
	('1feabf0f-6cea-4f1e-bdea-d2c7f8ccfd75', 'bbc9e993-8262-45ce-9338-e8934c4e13d4', 'door_staff'),
	('ed299292-a6e0-43a6-8595-167c2b59edf5', '335adc9e-265a-43a5-a1c5-b097309553cf', 'room_attendant'),
	('2d6d0637-a46f-4913-8d46-b1086fc57218', 'd2e588d8-8067-4beb-b1fc-f2528961c9ab', 'house_mom'),
	('3966f872-698c-45f1-8749-72875d6df26c', '0bb35f58-f193-4963-ab07-2a4f6fb2f23c', 'door_staff'),
	('d125fc19-fd21-4c1b-8133-e7112ce287ef', '69d85e31-40b8-4366-b928-52f6f37fbd3b', 'manager'),
	('8d3dbcf7-0c42-4570-8d77-3d74a68e804e', 'f0b584d0-97d6-41e7-aefa-1596a174d15b', 'owner'),
	('6c97acf6-853a-4221-8cd6-98c2c2c17063', '5545accd-e3b4-44f6-8d17-0a9e66407cd2', 'room_attendant'),
	('fc1509d2-ddad-464b-84f3-3a5baaa899c7', '6b59ef6a-a276-4d89-8006-4820334b4d12', 'dj'),
	('ceded398-6701-4976-b02f-6f98b2fbdefc', '3d238b4e-089e-42c4-9678-a3d43c54339e', 'bartender');


--
-- Data for Name: buckets; Type: TABLE DATA; Schema: storage; Owner: supabase_storage_admin
--

INSERT INTO "storage"."buckets" ("id", "name", "owner", "created_at", "updated_at", "public", "avif_autodetection", "file_size_limit", "allowed_mime_types", "owner_id", "type") VALUES
	('dancer-profiles', 'dancer-profiles', NULL, '2026-03-17 16:59:53.298557+00', '2026-03-17 16:59:53.298557+00', false, false, NULL, NULL, NULL, 'STANDARD');


--
-- Data for Name: buckets_analytics; Type: TABLE DATA; Schema: storage; Owner: supabase_storage_admin
--



--
-- Data for Name: buckets_vectors; Type: TABLE DATA; Schema: storage; Owner: supabase_storage_admin
--



--
-- Data for Name: objects; Type: TABLE DATA; Schema: storage; Owner: supabase_storage_admin
--



--
-- Data for Name: s3_multipart_uploads; Type: TABLE DATA; Schema: storage; Owner: supabase_storage_admin
--



--
-- Data for Name: s3_multipart_uploads_parts; Type: TABLE DATA; Schema: storage; Owner: supabase_storage_admin
--



--
-- Data for Name: vector_indexes; Type: TABLE DATA; Schema: storage; Owner: supabase_storage_admin
--



--
-- Name: refresh_tokens_id_seq; Type: SEQUENCE SET; Schema: auth; Owner: supabase_auth_admin
--

SELECT pg_catalog.setval('"auth"."refresh_tokens_id_seq"', 1132, true);


--
-- Name: dancers_dancer_number_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('"public"."dancers_dancer_number_seq"', 13, true);


--
-- PostgreSQL database dump complete
--

-- \unrestrict IKcOgZqI8mMd3k9HLYdxvaDVfFGEmkcduNkLQ9w9EwTQolBMEUQu9Bgn1s7nGxd

RESET ALL;
