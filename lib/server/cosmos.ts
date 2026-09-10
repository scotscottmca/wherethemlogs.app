import { CosmosClient, type Container } from "@azure/cosmos";
import { DefaultAzureCredential } from "@azure/identity";

/**
 * One client per process. Cosmos is reached with the Function App's managed
 * identity - the account has local (key) auth disabled, so there is no
 * connection string anywhere in configuration.
 *
 * Locally, DefaultAzureCredential picks up `az login`; the developer needs the
 * same Cosmos data-plane role. See docs/DEPLOYMENT.md.
 */
let client: CosmosClient | undefined;

function getClient(): CosmosClient {
  if (client) return client;

  const endpoint = process.env.COSMOS_ENDPOINT;
  if (!endpoint) throw new Error("COSMOS_ENDPOINT is not configured.");

  client = new CosmosClient({
    endpoint,
    aadCredentials: new DefaultAzureCredential(),
    connectionPolicy: {
      // A cold Function instance should fail fast rather than hold the request.
      requestTimeout: 10_000,
    },
  });
  return client;
}

function db() {
  return getClient().database(process.env.COSMOS_DATABASE ?? "wtla");
}

export const vendors = (): Container => db().container("vendors");
export const apps = (): Container => db().container("apps");
