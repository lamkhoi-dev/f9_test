import { GoogleGenAI } from '@google/genai';

async function run() {
  const ai = new GoogleGenAI({
    vertexai: {
      project: 'fake-project-123',
      location: 'us-central1'
    },
    googleAuthOptions: {
      credentials: {
        client_email: 'fake@fake.com',
        private_key: '-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC...\n-----END PRIVATE KEY-----\n'
      }
    }
  });

  try {
    const res = await ai.models.generateContent({
      model: 'gemini-1.5-flash',
      contents: 'hello'
    });
    console.log("SUCCESS:", res.text);
  } catch (e) {
    console.log("ERROR:", e.message);
  }
}
run();
