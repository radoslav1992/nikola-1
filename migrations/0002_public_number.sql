-- Short public number per property (shown as 00001, 00002 …) that visitors can
-- quote to Nikola or the assistant. It is given on first publication and never
-- changes or gets reused; the internal id stays the technical key.
ALTER TABLE properties ADD COLUMN public_no INTEGER;
UPDATE properties SET public_no = (
  SELECT n FROM (
    SELECT id, ROW_NUMBER() OVER (ORDER BY created_at, id) AS n
    FROM properties WHERE publication = 'published'
  ) AS numbered WHERE numbered.id = properties.id
) WHERE publication = 'published';
CREATE UNIQUE INDEX IF NOT EXISTS properties_public_no ON properties(public_no);
