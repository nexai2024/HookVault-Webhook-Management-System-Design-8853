/**
 * Seed script: bootstraps a demo user and prints a usable API key.
 * Run with:  npm run db:seed
 *
 * The raw API key is shown only here - copy it and use it as:
 *   Authorization: Bearer hv_...
 */
import { prisma } from '../lib/prisma';
import { generateApiKey } from '../lib/auth';
import { generateVaultSecret } from '../lib/hmac';

async function main() {
  const email = process.env.SEED_EMAIL || 'demo@hookvault.com';

  const user = await prisma.user.upsert({
    where: { email },
    update: {},
    create: { email, name: 'Demo User' },
  });

  const { raw, hashedKey, prefix } = generateApiKey();
  await prisma.apiKey.create({
    data: {
      userId: user.id,
      name: 'Seed key',
      hashedKey,
      prefix,
    },
  });

  // Create a starter vault so ingestion can be tested immediately.
  const vault = await prisma.vault.create({
    data: {
      userId: user.id,
      name: 'Production Stripe',
      targetUrl: 'https://example.com/webhooks',
      secret: generateVaultSecret(),
    },
  });

  console.log('\n Seed complete');
  console.log('------------------------------------------------------------');
  console.log(`User:     ${user.email} (${user.id})`);
  console.log(`Vault:    ${vault.name} (${vault.id})`);
  console.log(`API key:  ${raw}`);
  console.log('------------------------------------------------------------');
  console.log('Try ingesting a webhook:');
  console.log(
    `  curl -X POST http://localhost:4000/api/v1/ingest/${vault.id} \\\n` +
      `    -H "Content-Type: application/json" \\\n` +
      `    -d '{"event":"payment.succeeded","amount":4200}'`,
  );
  console.log('\nList your vaults:');
  console.log(
    `  curl http://localhost:4000/api/vaults -H "Authorization: Bearer ${raw}"\n`,
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
