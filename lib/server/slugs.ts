import { apps, vendors } from "./cosmos";
import { conflict } from "./errors";

/**
 * Slug uniqueness.
 *
 * Cosmos unique keys are scoped to a partition, which does not match what a
 * slug means here:
 *
 *   vendors  partitioned by /id       - every document is alone in its
 *                                       partition, so a unique key enforces
 *                                       nothing at all
 *   apps     partitioned by /vendorId - the unique key makes a slug unique
 *                                       within one vendor, but two vendors
 *                                       could both own "chrome"
 *
 * Slugs are URLs, so they have to be unique across the whole container. These
 * run one cross-partition query per write, which is nothing: writes are rare
 * and reads never come near this path.
 */

async function assertFree(
  container: () => ReturnType<typeof vendors>,
  what: string,
  slug: string,
  exceptId?: string,
) {
  const { resources } = await container()
    .items.query<{ id: string; name: string }>({
      query: "SELECT c.id, c.name FROM c WHERE c.slug = @slug",
      parameters: [{ name: "@slug", value: slug }],
    })
    .fetchAll();

  const clash = resources.find((r) => r.id !== exceptId);
  if (clash) {
    throw conflict(
      `The slug "${slug}" already belongs to ${what} "${clash.name}". Slugs are URLs, so they have to be unique.`,
      { conflictsWith: { id: clash.id, name: clash.name } },
    );
  }
}

export const assertVendorSlugFree = (slug: string, exceptId?: string) =>
  assertFree(vendors, "the vendor", slug, exceptId);

export const assertAppSlugFree = (slug: string, exceptId?: string) =>
  assertFree(apps, "the app", slug, exceptId);
