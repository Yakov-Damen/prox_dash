#!/usr/bin/env node
/**
 * Simple OpenStack connection test script
 * Usage: node test-openstack.js
 *
 * Tests the same authentication flow used by the app
 */

const config = {
  authUrl: 'http://localhost:3000/api/mock-openstack/identity/v3',
  projectName: 'mock-project',
  username: 'admin',
  password: 'password',
  userDomainName: 'Default',
  projectDomainName: 'Default',
  region: 'RegionOne',
};

async function testConnection() {
  console.log('🔐 Testing OpenStack connection...\n');
  console.log('Config:', JSON.stringify(config, null, 2), '\n');

  // Step 1: Authenticate with Keystone
  console.log('Step 1: Authenticating with Keystone...');
  const authPayload = {
    auth: {
      identity: {
        methods: ['password'],
        password: {
          user: {
            name: config.username,
            password: config.password,
            domain: { name: config.userDomainName },
          },
        },
      },
      scope: {
        project: {
          name: config.projectName,
          domain: { name: config.projectDomainName },
        },
      },
    },
  };

  const tokenUrl = `${config.authUrl}/auth/tokens`;
  console.log(`  POST ${tokenUrl}`);

  try {
    const authResponse = await fetch(tokenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(authPayload),
    });

    if (!authResponse.ok) {
      const error = await authResponse.text();
      console.error(`  ❌ Auth failed: ${authResponse.status} ${authResponse.statusText}`);
      console.error(`  Error: ${error}`);
      return;
    }

    const token = authResponse.headers.get('X-Subject-Token');
    const body = await authResponse.json();

    console.log(`  ✅ Auth successful!`);
    console.log(`  Token: ${token?.substring(0, 20)}...`);
    console.log(`  Project ID: ${body.token?.project?.id}`);
    console.log(`  User: ${body.token?.user?.name}`);
    console.log(`  Roles: ${body.token?.roles?.map(r => r.name).join(', ')}`);

    // Find Nova endpoint
    const novaService = body.token?.catalog?.find(s => s.type === 'compute');
    const novaEndpoint = novaService?.endpoints?.find(
      e => e.interface === 'public' && (!config.region || e.region_id === config.region)
    );

    if (!novaEndpoint) {
      console.error('  ❌ Nova endpoint not found in service catalog');
      return;
    }

    console.log(`  Nova endpoint: ${novaEndpoint.url}\n`);

    // Step 2: Test Nova API - List servers
    console.log('Step 2: Testing Nova API (list servers)...');
    const serversUrl = `${novaEndpoint.url}/servers?limit=5`;
    console.log(`  GET ${serversUrl}`);

    const serversResponse = await fetch(serversUrl, {
      headers: { 'X-Auth-Token': token },
    });

    if (!serversResponse.ok) {
      const error = await serversResponse.text();
      console.error(`  ❌ Nova request failed: ${serversResponse.status}`);
      console.error(`  Error: ${error}`);
      return;
    }

    const servers = await serversResponse.json();
    console.log(`  ✅ Nova API accessible!`);
    console.log(`  Found ${servers.servers?.length || 0} servers\n`);

    // Step 3: Test hypervisors (admin only)
    console.log('Step 3: Testing Nova API (list hypervisors - admin only)...');
    const hypervisorsUrl = `${novaEndpoint.url}/os-hypervisors/detail`;
    console.log(`  GET ${hypervisorsUrl}`);

    const hypervisorsResponse = await fetch(hypervisorsUrl, {
      headers: { 'X-Auth-Token': token },
    });

    if (!hypervisorsResponse.ok) {
      console.log(`  ⚠️ Hypervisors not accessible (might not be admin): ${hypervisorsResponse.status}`);
    } else {
      const hypervisors = await hypervisorsResponse.json();
      console.log(`  ✅ Hypervisors accessible (admin mode)!`);
      console.log(`  Found ${hypervisors.hypervisors?.length || 0} hypervisors\n`);
    }

    console.log('✅ OpenStack connection test completed successfully!');

  } catch (error) {
    console.error(`❌ Connection error: ${error.message}`);
    if (error.cause) {
      console.error(`  Cause: ${error.cause.message}`);
    }
  }
}

testConnection();
