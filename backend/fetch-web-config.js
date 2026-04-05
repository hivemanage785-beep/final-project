import { GoogleAuth } from 'google-auth-library';
import fs from 'fs';

async function fetchFirebaseConfig() {
  const auth = new GoogleAuth({
    keyFile: './serviceAccountKey.json',
    scopes: ['https://www.googleapis.com/auth/cloud-platform', 'https://www.googleapis.com/auth/firebase']
  });

  const client = await auth.getClient();
  const projectId = 'gen-lang-client-0616022840';

  // 1. List Web Apps
  const res = await client.request({
    url: `https://firebase.googleapis.com/v1beta1/projects/${projectId}/webApps`
  });
  
  if (!res.data.apps || res.data.apps.length === 0) {
     console.error("No web apps found for this project.");
     return;
  }
  const appId = res.data.apps[0].appId;
  
  // 2. Get Config for the first Web App
  const configRes = await client.request({
    url: `https://firebase.googleapis.com/v1beta1/projects/${projectId}/webApps/${appId}/config`
  });

  console.log(JSON.stringify(configRes.data, null, 2));
}

fetchFirebaseConfig().catch(console.error);
