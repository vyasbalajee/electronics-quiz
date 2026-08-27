// Cloudinary orphan cleanup (reconciliation sweep).
//
// Lists every image in the Cloudinary "electronics-quiz" folder, compares it to
// what the database references, and deletes images the database no longer uses.
//
// Runs as a standalone tool (no dependency on the app's db.js) so it can run in
// a GitHub Action over the PUBLIC database URL. Needs, in the environment:
//   DATABASE_PUBLIC_URL          - Railway public Postgres connection string
//   CLOUDINARY_CLOUD_NAME
//   CLOUDINARY_API_KEY           - must allow Admin API list + delete
//   CLOUDINARY_API_SECRET
//   SWEEP_CONFIRM=true           - actually delete (default: dry-run, deletes nothing)
//
// Safety:
//   - Dry-run by default; only deletes when SWEEP_CONFIRM=true.
//   - Refuses to delete if the DB references ZERO images (that almost always
//     means a failed read, and deleting everything would be catastrophic).
//   - Protects pre-A1 rows: an image is kept if EITHER the public_id column OR
//     the public_id derived from the stored URL matches it.

const { Client } = require('pg');
const cloudinary = require('cloudinary').v2;

const FOLDER = 'electronics-quiz';
const CONFIRM = process.env.SWEEP_CONFIRM === 'true';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Derive a Cloudinary public_id from a stored secure_url. This app uses no
// transformations, so the URL is .../upload/v<version>/<public_id>.<ext>
function publicIdFromUrl(url) {
  if (!url || typeof url !== 'string') return null;
  const marker = '/upload/';
  const i = url.indexOf(marker);
  if (i === -1) return null;
  let rest = url.slice(i + marker.length);
  rest = rest.replace(/^v\d+\//, ''); // strip version segment
  rest = rest.replace(/\.[^/.]+$/, ''); // strip file extension
  return rest || null;
}

async function listAllCloudinaryImages() {
  const ids = [];
  let next;
  do {
    const res = await cloudinary.api.resources({
      type: 'upload',
      prefix: FOLDER,
      max_results: 500,
      next_cursor: next,
    });
    for (const r of res.resources) ids.push(r.public_id);
    next = res.next_cursor;
  } while (next);
  return ids;
}

async function getReferencedPublicIds(client) {
  const { rows } = await client.query(
    'SELECT cloudinary_public_id, image_filename FROM questions'
  );
  const set = new Set();
  for (const row of rows) {
    if (row.cloudinary_public_id) set.add(row.cloudinary_public_id);
    const derived = publicIdFromUrl(row.image_filename);
    if (derived) set.add(derived);
  }
  return set;
}

async function main() {
  if (!process.env.DATABASE_PUBLIC_URL) {
    throw new Error('DATABASE_PUBLIC_URL is not set.');
  }

  const client = new Client({
    connectionString: process.env.DATABASE_PUBLIC_URL,
    ssl: { rejectUnauthorized: false },
  });
  await client.connect();

  try {
    const [cloudIds, referenced] = await Promise.all([
      listAllCloudinaryImages(),
      getReferencedPublicIds(client),
    ]);

    console.log(`Cloudinary images in "${FOLDER}" : ${cloudIds.length}`);
    console.log(`Referenced by the database        : ${referenced.size}`);

    // Safety guard: never delete everything because a read came back empty.
    if (referenced.size === 0) {
      console.log(
        '\nThe database references ZERO images. Refusing to delete anything ' +
        '(this usually means a failed DB read, not a truly empty set).'
      );
      return;
    }

    const orphans = cloudIds.filter((id) => !referenced.has(id));
    console.log(`Orphans (in Cloudinary, not in DB): ${orphans.length}`);

    if (orphans.length === 0) {
      console.log('Nothing to clean up.');
      return;
    }

    console.log('\nOrphaned public_ids:');
    for (const id of orphans) console.log(`  - ${id}`);

    if (!CONFIRM) {
      console.log('\nDRY RUN — nothing deleted. Set SWEEP_CONFIRM=true to delete these.');
      return;
    }

    console.log('\nDeleting orphans...');
    let deleted = 0;
    for (const id of orphans) {
      try {
        await cloudinary.uploader.destroy(id, { resource_type: 'image' });
        deleted++;
      } catch (e) {
        console.error(`  failed to delete ${id}: ${e.message}`);
      }
    }
    console.log(`Deleted ${deleted}/${orphans.length} orphan(s).`);
  } finally {
    await client.end();
  }
}

main().catch((e) => {
  console.error('Sweep failed:', e.message);
  process.exit(1);
});
