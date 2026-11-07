// Compatibility entry point: the preview now uses the relational Supabase API.
// Do not use the former JSONB product upsert repository against the current schema.
export {
  configured, projectRef, signIn, signOut, currentUser, checkAdmin,
  normalizeProduct, listProducts, listPublicProducts, saveProduct,
  archiveProduct, listHome, saveHomeSection, uploadImage, removeImage, publicProduct
} from "./client.js";
