-- Seed data for new Supabase project
-- Run in Supabase Dashboard SQL Editor

-- 1. Project Round
INSERT INTO project_rounds (id, name, description, status, created_at, published_at, updated_at) VALUES
  ('a0000000-0000-0000-0000-000000000001', 'Python Project — Round 1', 'The first capstone project round for the Python Fellowship Program.', 'PUBLISHED', now(), now(), now())
ON CONFLICT (id) DO NOTHING;

-- 2. Project Groups
INSERT INTO project_groups (id, project_round_id, level, group_number, name) VALUES
  ('55b5c884-4957-4097-ba99-88a8616fa115', 'a0000000-0000-0000-0000-000000000001', 'ADVANCED', 1, 'Advanced — Group 1'),
  ('25b1d1b9-3b00-4893-8bec-fc81ec08cbdb', 'a0000000-0000-0000-0000-000000000001', 'ADVANCED', 2, 'Advanced — Group 2'),
  ('3a48f6d9-dcc7-475c-85c2-93e5af5b67e4', 'a0000000-0000-0000-0000-000000000001', 'UPPER_INTERMEDIATE', 1, 'Upper Intermediate — Group 1'),
  ('89b0a9a0-574a-445e-82d8-396579e8e10f', 'a0000000-0000-0000-0000-000000000001', 'UPPER_INTERMEDIATE', 2, 'Upper Intermediate — Group 2'),
  ('cec85499-045c-4116-b444-dc3a9c23d043', 'a0000000-0000-0000-0000-000000000001', 'UPPER_INTERMEDIATE', 3, 'Upper Intermediate — Group 3'),
  ('11aa65fd-e2fc-44ea-880e-a9db94317a14', 'a0000000-0000-0000-0000-000000000001', 'INTERMEDIATE', 1, 'Intermediate — Group 1'),
  ('00176ed8-606f-43db-b127-35043116fe55', 'a0000000-0000-0000-0000-000000000001', 'INTERMEDIATE', 2, 'Intermediate — Group 2'),
  ('85c19ab2-3d08-4513-8310-2ec9bcec5ad8', 'a0000000-0000-0000-0000-000000000001', 'INTERMEDIATE', 3, 'Intermediate — Group 3'),
  ('03c39659-452e-4904-9661-a42fce191ee6', 'a0000000-0000-0000-0000-000000000001', 'INTERMEDIATE', 4, 'Intermediate — Group 4'),
  ('c697adff-2f4d-4d77-a99f-4b7b2dd104a2', 'a0000000-0000-0000-0000-000000000001', 'DEVELOPING', 1, 'Developing — Group 1'),
  ('0210807f-e272-4edc-9631-27a166e7f9dd', 'a0000000-0000-0000-0000-000000000001', 'DEVELOPING', 2, 'Developing — Group 2'),
  ('0b0df2dd-3725-40e2-9fca-5888f822b5d4', 'a0000000-0000-0000-0000-000000000001', 'DEVELOPING', 3, 'Developing — Group 3'),
  ('5231b167-a6d1-4b8c-b345-6a3cf9d06a8f', 'a0000000-0000-0000-0000-000000000001', 'DEVELOPING', 4, 'Developing — Group 4'),
  ('6d28824a-2bd3-49b0-be75-bf509233c4db', 'a0000000-0000-0000-0000-000000000001', 'BEGINNER', 1, 'Beginner — Group 1'),
  ('c06f491c-9993-4a2f-b907-dbf12be6bb01', 'a0000000-0000-0000-0000-000000000001', 'BEGINNER', 2, 'Beginner — Group 2'),
  ('e1ece714-3562-4708-9cd3-d1e3e2f10fc6', 'a0000000-0000-0000-0000-000000000001', 'BEGINNER', 3, 'Beginner — Group 3'),
  ('33e9a276-90e9-481f-b7bc-8106556d268b', 'a0000000-0000-0000-0000-000000000001', 'BEGINNER', 4, 'Beginner — Group 4')
ON CONFLICT (id) DO NOTHING;

-- 3. Temp table: ranking -> group_id mapping
CREATE TEMP TABLE rank_group_map (ranking int, group_id uuid);
INSERT INTO rank_group_map VALUES
  (1,'55b5c884-4957-4097-ba99-88a8616fa115'),(2,'55b5c884-4957-4097-ba99-88a8616fa115'),(3,'55b5c884-4957-4097-ba99-88a8616fa115'),(4,'55b5c884-4957-4097-ba99-88a8616fa115'),(5,'55b5c884-4957-4097-ba99-88a8616fa115'),(6,'55b5c884-4957-4097-ba99-88a8616fa115'),(7,'55b5c884-4957-4097-ba99-88a8616fa115'),(8,'55b5c884-4957-4097-ba99-88a8616fa115'),
  (9,'25b1d1b9-3b00-4893-8bec-fc81ec08cbdb'),(10,'25b1d1b9-3b00-4893-8bec-fc81ec08cbdb'),(11,'25b1d1b9-3b00-4893-8bec-fc81ec08cbdb'),(12,'25b1d1b9-3b00-4893-8bec-fc81ec08cbdb'),(13,'25b1d1b9-3b00-4893-8bec-fc81ec08cbdb'),(14,'25b1d1b9-3b00-4893-8bec-fc81ec08cbdb'),(15,'25b1d1b9-3b00-4893-8bec-fc81ec08cbdb'),
  (16,'3a48f6d9-dcc7-475c-85c2-93e5af5b67e4'),(17,'3a48f6d9-dcc7-475c-85c2-93e5af5b67e4'),(18,'3a48f6d9-dcc7-475c-85c2-93e5af5b67e4'),(19,'3a48f6d9-dcc7-475c-85c2-93e5af5b67e4'),(20,'3a48f6d9-dcc7-475c-85c2-93e5af5b67e4'),
  (21,'89b0a9a0-574a-445e-82d8-396579e8e10f'),(22,'89b0a9a0-574a-445e-82d8-396579e8e10f'),(23,'89b0a9a0-574a-445e-82d8-396579e8e10f'),(24,'89b0a9a0-574a-445e-82d8-396579e8e10f'),(25,'89b0a9a0-574a-445e-82d8-396579e8e10f'),(26,'89b0a9a0-574a-445e-82d8-396579e8e10f'),
  (27,'cec85499-045c-4116-b444-dc3a9c23d043'),(28,'cec85499-045c-4116-b444-dc3a9c23d043'),(29,'cec85499-045c-4116-b444-dc3a9c23d043'),(30,'cec85499-045c-4116-b444-dc3a9c23d043'),(31,'cec85499-045c-4116-b444-dc3a9c23d043'),(32,'cec85499-045c-4116-b444-dc3a9c23d043'),(33,'cec85499-045c-4116-b444-dc3a9c23d043'),
  (34,'11aa65fd-e2fc-44ea-880e-a9db94317a14'),(35,'11aa65fd-e2fc-44ea-880e-a9db94317a14'),(36,'11aa65fd-e2fc-44ea-880e-a9db94317a14'),(37,'11aa65fd-e2fc-44ea-880e-a9db94317a14'),(38,'11aa65fd-e2fc-44ea-880e-a9db94317a14'),(39,'11aa65fd-e2fc-44ea-880e-a9db94317a14'),
  (40,'00176ed8-606f-43db-b127-35043116fe55'),(41,'00176ed8-606f-43db-b127-35043116fe55'),(42,'00176ed8-606f-43db-b127-35043116fe55'),(43,'00176ed8-606f-43db-b127-35043116fe55'),(44,'00176ed8-606f-43db-b127-35043116fe55'),(45,'00176ed8-606f-43db-b127-35043116fe55'),(46,'00176ed8-606f-43db-b127-35043116fe55'),
  (47,'85c19ab2-3d08-4513-8310-2ec9bcec5ad8'),(48,'85c19ab2-3d08-4513-8310-2ec9bcec5ad8'),(49,'85c19ab2-3d08-4513-8310-2ec9bcec5ad8'),(50,'85c19ab2-3d08-4513-8310-2ec9bcec5ad8'),(51,'85c19ab2-3d08-4513-8310-2ec9bcec5ad8'),(52,'85c19ab2-3d08-4513-8310-2ec9bcec5ad8'),(53,'85c19ab2-3d08-4513-8310-2ec9bcec5ad8'),
  (54,'03c39659-452e-4904-9661-a42fce191ee6'),(55,'03c39659-452e-4904-9661-a42fce191ee6'),(56,'03c39659-452e-4904-9661-a42fce191ee6'),(57,'03c39659-452e-4904-9661-a42fce191ee6'),(58,'03c39659-452e-4904-9661-a42fce191ee6'),(59,'03c39659-452e-4904-9661-a42fce191ee6'),(60,'03c39659-452e-4904-9661-a42fce191ee6'),(61,'03c39659-452e-4904-9661-a42fce191ee6'),
  (62,'c697adff-2f4d-4d77-a99f-4b7b2dd104a2'),(63,'c697adff-2f4d-4d77-a99f-4b7b2dd104a2'),(64,'c697adff-2f4d-4d77-a99f-4b7b2dd104a2'),(65,'c697adff-2f4d-4d77-a99f-4b7b2dd104a2'),(66,'c697adff-2f4d-4d77-a99f-4b7b2dd104a2'),(67,'c697adff-2f4d-4d77-a99f-4b7b2dd104a2'),
  (68,'0210807f-e272-4edc-9631-27a166e7f9dd'),(69,'0210807f-e272-4edc-9631-27a166e7f9dd'),(70,'0210807f-e272-4edc-9631-27a166e7f9dd'),(71,'0210807f-e272-4edc-9631-27a166e7f9dd'),(72,'0210807f-e272-4edc-9631-27a166e7f9dd'),(73,'0210807f-e272-4edc-9631-27a166e7f9dd'),
  (74,'0b0df2dd-3725-40e2-9fca-5888f822b5d4'),(75,'0b0df2dd-3725-40e2-9fca-5888f822b5d4'),(76,'0b0df2dd-3725-40e2-9fca-5888f822b5d4'),(77,'0b0df2dd-3725-40e2-9fca-5888f822b5d4'),(78,'0b0df2dd-3725-40e2-9fca-5888f822b5d4'),(79,'0b0df2dd-3725-40e2-9fca-5888f822b5d4'),(87,'0b0df2dd-3725-40e2-9fca-5888f822b5d4'),
  (80,'5231b167-a6d1-4b8c-b345-6a3cf9d06a8f'),(81,'5231b167-a6d1-4b8c-b345-6a3cf9d06a8f'),(82,'5231b167-a6d1-4b8c-b345-6a3cf9d06a8f'),(83,'5231b167-a6d1-4b8c-b345-6a3cf9d06a8f'),(84,'5231b167-a6d1-4b8c-b345-6a3cf9d06a8f'),(85,'5231b167-a6d1-4b8c-b345-6a3cf9d06a8f'),(86,'5231b167-a6d1-4b8c-b345-6a3cf9d06a8f'),
  (88,'6d28824a-2bd3-49b0-be75-bf509233c4db'),(89,'6d28824a-2bd3-49b0-be75-bf509233c4db'),(90,'6d28824a-2bd3-49b0-be75-bf509233c4db'),(92,'6d28824a-2bd3-49b0-be75-bf509233c4db'),(93,'6d28824a-2bd3-49b0-be75-bf509233c4db'),(94,'6d28824a-2bd3-49b0-be75-bf509233c4db'),
  (95,'c06f491c-9993-4a2f-b907-dbf12be6bb01'),(96,'c06f491c-9993-4a2f-b907-dbf12be6bb01'),(97,'c06f491c-9993-4a2f-b907-dbf12be6bb01'),(98,'c06f491c-9993-4a2f-b907-dbf12be6bb01'),(99,'c06f491c-9993-4a2f-b907-dbf12be6bb01'),(100,'c06f491c-9993-4a2f-b907-dbf12be6bb01'),
  (101,'e1ece714-3562-4708-9cd3-d1e3e2f10fc6'),(102,'e1ece714-3562-4708-9cd3-d1e3e2f10fc6'),(103,'e1ece714-3562-4708-9cd3-d1e3e2f10fc6'),(104,'e1ece714-3562-4708-9cd3-d1e3e2f10fc6'),(105,'e1ece714-3562-4708-9cd3-d1e3e2f10fc6'),(106,'e1ece714-3562-4708-9cd3-d1e3e2f10fc6'),
  (107,'33e9a276-90e9-481f-b7bc-8106556d268b'),(108,'33e9a276-90e9-481f-b7bc-8106556d268b'),(109,'33e9a276-90e9-481f-b7bc-8106556d268b'),(110,'33e9a276-90e9-481f-b7bc-8106556d268b'),(111,'33e9a276-90e9-481f-b7bc-8106556d268b'),(112,'33e9a276-90e9-481f-b7bc-8106556d268b');

-- 4. Temp table: all fellows (first_name, last_name, ranking, level)
CREATE TEMP TABLE fellow_seed (first_name text, last_name text, ranking int, level fellow_level);
INSERT INTO fellow_seed VALUES
  ('Faith','Ogunlade',1,'ADVANCED'),('Kayode','Oke',2,'ADVANCED'),('Ayobami','Ogunlade',3,'ADVANCED'),('Favour','Enu',4,'ADVANCED'),('Victory','Itedjere',5,'ADVANCED'),('Blessing','Ojo',6,'ADVANCED'),('Ayowande','Ogunlade',7,'ADVANCED'),('Benjamin','Osadare',8,'ADVANCED'),
  ('Elohor','Aghanokpe',9,'ADVANCED'),('Imoleayo','David',10,'ADVANCED'),('Promise','Oluwalade',11,'ADVANCED'),('Omoniyi','Dada',12,'ADVANCED'),('Olamilekan','Osundahunsi',13,'ADVANCED'),('Ayodeji','Aronimo',14,'ADVANCED'),('Blessing','Olaniyi',15,'ADVANCED'),
  ('Abiodun','Tehingbola',16,'UPPER_INTERMEDIATE'),('Oluwatosin','Alebiosu',17,'UPPER_INTERMEDIATE'),('Olusola','David',18,'UPPER_INTERMEDIATE'),('Godson','Ibeaka',19,'UPPER_INTERMEDIATE'),('Oluwafemi','Oni',20,'UPPER_INTERMEDIATE'),
  ('Monday','Ezieh',21,'UPPER_INTERMEDIATE'),('Paul','Oluyemi',22,'UPPER_INTERMEDIATE'),('Oluwafemi','Olajoye',23,'UPPER_INTERMEDIATE'),('Ifeoluwani','Okeade',24,'UPPER_INTERMEDIATE'),('Christianah','Akanni',25,'UPPER_INTERMEDIATE'),('Oluwadare Tobi','Jayeola',26,'UPPER_INTERMEDIATE'),
  ('Adebayo','Oluwabusola',27,'UPPER_INTERMEDIATE'),('Kenneth','Fatore',28,'UPPER_INTERMEDIATE'),('Oluwaseun','Elugbaju',29,'UPPER_INTERMEDIATE'),('Abiodun','Ojo',30,'UPPER_INTERMEDIATE'),('Nathaniel','Alfred',31,'UPPER_INTERMEDIATE'),('Toyosi','Omitusa',32,'UPPER_INTERMEDIATE'),('Oluwanifemi','Oluyemi',33,'UPPER_INTERMEDIATE'),
  ('Adeoluwa','Fakehinde',34,'INTERMEDIATE'),('Michael','Olofin',35,'INTERMEDIATE'),('Blessing','Ezieh',36,'INTERMEDIATE'),('Oluwakayode','Kehinde',37,'INTERMEDIATE'),('Bamidele','Ajayi',38,'INTERMEDIATE'),('Esther','Kusimo',39,'INTERMEDIATE'),
  ('Faith','Abayomi',40,'INTERMEDIATE'),('Lazarus','Friday',41,'INTERMEDIATE'),('Daniel','Adeyemi',42,'INTERMEDIATE'),('Oyenike','Ojo',43,'INTERMEDIATE'),('Kolade','Owolabi',44,'INTERMEDIATE'),('Mary','Imoh',45,'INTERMEDIATE'),('Michael','Osadare',46,'INTERMEDIATE'),
  ('Abiola','Olufiade',47,'INTERMEDIATE'),('David','Bassey',48,'INTERMEDIATE'),('Temiloluwa','Abiodun',49,'INTERMEDIATE'),('Emmanuel','Olowu',50,'INTERMEDIATE'),('Oluwagbemileke','Agboola',51,'INTERMEDIATE'),('Oluwatosin','Adenola',52,'INTERMEDIATE'),('Akinola','Heritage',53,'INTERMEDIATE'),
  ('Korede','Adelusi',54,'INTERMEDIATE'),('Ruth','Akoleaje',55,'INTERMEDIATE'),('Odunayo','Jeje',56,'INTERMEDIATE'),('Olugbenga','Ojo',57,'INTERMEDIATE'),('Nifemi','Akinyemi',58,'INTERMEDIATE'),('Ebenezer','Olatunya',59,'INTERMEDIATE'),('Toluwalope','Omosebi',60,'INTERMEDIATE'),('OLUWAFEMI','ADENIYI',61,'INTERMEDIATE'),
  ('Oluwapelumi','Alo',62,'DEVELOPING'),('Gbenga','Afolabi',63,'DEVELOPING'),('Veronica','Inibu',64,'DEVELOPING'),('Oluwakemi','Adeosun',65,'DEVELOPING'),('Esther Royalty','Akinfolahan',66,'DEVELOPING'),('Praise','Samson',67,'DEVELOPING'),
  ('Daniel','Akintade',68,'DEVELOPING'),('Stephen','Alabi',69,'DEVELOPING'),('Ayomide','Alade',70,'DEVELOPING'),('Matthew','Adeniran',71,'DEVELOPING'),('Adedoyin','Oluwafemi',72,'DEVELOPING'),('Oluwamurewa','Ayodele',73,'DEVELOPING'),
  ('Kehinde','Olukayode',74,'DEVELOPING'),('Victor','Ogunyemi',75,'DEVELOPING'),('Emmanuelah','Bello',76,'DEVELOPING'),('Oluwatosin','Fashel',77,'DEVELOPING'),('Olanrewaju','Odudele',78,'DEVELOPING'),('Funmilayo','Ojo',79,'DEVELOPING'),('Tope','Ilesanmi',87,'DEVELOPING'),
  ('Victor','Wave',80,'DEVELOPING'),('Joshua','Ajiboye',81,'DEVELOPING'),('Kehinde','Oladimeji',82,'DEVELOPING'),('Ayobami','Adeluka',83,'DEVELOPING'),('Oluwaseun','Oluwole',84,'DEVELOPING'),('Tolulope','Oladapo',85,'DEVELOPING'),('EMMANUEL','AREMU',86,'DEVELOPING'),
  ('Saviour','Godfrey',88,'BEGINNER'),('Blessing','Alabi',89,'BEGINNER'),('Temitope','Fabunmi',90,'BEGINNER'),('Peace','Omorilewa',92,'BEGINNER'),('Adetola','Akinbami',93,'BEGINNER'),('Oluwanifemi','Adebayo',94,'BEGINNER'),
  ('Jesufemi','Omolayo',95,'BEGINNER'),('Priscilla','Olusanya',96,'BEGINNER'),('Daniel','Fatimehin',97,'BEGINNER'),('Abiodun','Akingun',98,'BEGINNER'),('Israel','Kolawole',99,'BEGINNER'),('Tolulope','Popoola',100,'BEGINNER'),
  ('Emmanuel','Ogunkoyode',101,'BEGINNER'),('Christiana','Edem',102,'BEGINNER'),('David','Ntang',103,'BEGINNER'),('Kehinde','Coker',104,'BEGINNER'),('David','Okereke',105,'BEGINNER'),('Moses','Adeleke',106,'BEGINNER'),
  ('Godsfavour','Innocent',107,'BEGINNER'),('Peter','Aderehinwo',108,'BEGINNER'),('Ayobami','Ibiyemi',109,'BEGINNER'),('Molade','Olatunji',110,'BEGINNER'),('Wisdom','David',112,'BEGINNER'),('Ayodeji','Oluwole',111,'BEGINNER');

-- 5. Insert fellows (auto-generate UUID + email)
INSERT INTO fellows (id, first_name, last_name, email, ranking, lessons_completed, level, created_at, updated_at)
SELECT
  gen_random_uuid(),
  first_name,
  last_name,
  lower(replace(first_name, ' ', '.')) || '.' || lower(replace(last_name, ' ', '.')) || '@fellowship.org',
  ranking, 0, level, now(), now()
FROM fellow_seed
ORDER BY ranking;

-- 6. Insert group_members by joining fellows to rank_group_map
INSERT INTO group_members (id, project_group_id, fellow_id, is_leader, created_at, updated_at)
SELECT
  gen_random_uuid(),
  rgm.group_id,
  f.id,
  false,
  now(), now()
FROM fellows f
JOIN rank_group_map rgm ON rgm.ranking = f.ranking
ORDER BY f.ranking;

-- 7. Verify counts
SELECT 'fellows' AS table_name, count(*) AS cnt FROM fellows
UNION ALL SELECT 'project_groups', count(*) FROM project_groups
UNION ALL SELECT 'group_members', count(*) FROM group_members
UNION ALL SELECT 'project_rounds', count(*) FROM project_rounds;
