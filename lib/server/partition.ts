import { apps } from "./cosmos";
import { notFound } from "./errors";

/**
 * vendorId is the apps container's partition key, so every read and write of
 * an app needs it. Callers may pass it as a query parameter; otherwise it costs
 * one cross-partition lookup to find.
 */
export async function partitionFor(id: string, hint: string | null): Promise<string> {
  if (hint) return hint;

  const { resources } = await apps().items
    .query<{ vendorId: string }>({
      query: "SELECT c.vendorId FROM c WHERE c.id = @id",
      parameters: [{ name: "@id", value: id }],
    })
    .fetchAll();

  const found = resources[0];
  if (!found) throw notFound(`App "${id}"`);
  return found.vendorId;
}
