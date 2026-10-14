/**
 * Creates a dashboard user. The password is prompted for (hidden) and is never printed.
 *
 * Usage: npm run user:create -- --email boss@example.com --name "Boss" [--role ADMIN|MANAGER] [--org <organization id>]
 */
const readline = require('readline');
const service = require('../../src/modules/auth/service');
const { disconnect } = require('../../src/platform/db');

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i += 2) args[argv[i].replace(/^--/, '')] = argv[i + 1];
  return args;
}

function promptHidden(question) {
  return new Promise((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: true });
    rl._writeToOutput = (text) => { if (text.includes(question)) rl.output.write(question); };
    rl.question(question, (answer) => {
      rl.close();
      process.stdout.write('\n');
      resolve(answer);
    });
  });
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!args.email || !args.name) throw new Error('Usage: npm run user:create -- --email <email> --name <name> [--role ADMIN|MANAGER] [--org <id>]');
  const password = await promptHidden('Password (8 to 128 characters): ');
  if (password !== await promptHidden('Repeat password: ')) throw new Error('The passwords do not match.');
  const user = await service.createUser({
    email: args.email, name: args.name, password, role: args.role, organizationId: args.org,
  });
  console.log(`Created user ${user.email}.`);
}

main()
  .catch((err) => {
    console.error(err.details ? `${err.message} ${JSON.stringify(err.details.map?.((d) => d.message) ?? err.details)}` : err.message);
    process.exitCode = 1;
  })
  .finally(() => disconnect());
