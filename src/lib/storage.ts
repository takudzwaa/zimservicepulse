import { put } from "@vercel/blob";

export async function storeDatasetFile(input: {
  authorityId: string;
  filename: string;
  body: string;
}): Promise<string | null> {
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("BLOB_READ_WRITE_TOKEN is not configured");
    }
    return null;
  }
  const safeName = input.filename.replace(/[^a-zA-Z0-9._-]/g, "_");
  const blob = await put(
    `datasets/${input.authorityId}/${Date.now()}-${safeName}`,
    input.body,
    {
      access: "private",
      addRandomSuffix: true,
      contentType: "text/csv;charset=utf-8",
    },
  );
  return blob.url;
}
