"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sanityFetchWrapper = sanityFetchWrapper;
exports.sanityCreateWrapper = sanityCreateWrapper;
exports.sanityPatchWrapper = sanityPatchWrapper;
const sanityClient_1 = require("./sanityClient");
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function sanityFetchWrapper(
    query,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    params = {}
) {
    try {
        const result = await sanityClient_1.sanityClient.fetch(query, params);
        return result;
    } catch (error) {
        console.error("Sanity fetch error:", error);
        const sanityError = new Error(
            error instanceof Error ? error.message : "Sanity query failed"
        );
        sanityError.name = "SanityError";
        sanityError.status = 500;
        sanityError.data = error;
        throw sanityError;
    }
}
async function sanityCreateWrapper(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    document,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    options
) {
    try {
        const result = await sanityClient_1.sanityClient.create(document, options);
        return result;
    } catch (error) {
        console.error("Sanity create error:", error);
        const sanityError = new Error(
            error instanceof Error ? error.message : "Sanity create failed"
        );
        sanityError.name = "SanityCreateError";
        sanityError.status = 500;
        sanityError.data = error;
        throw sanityError;
    }
}
async function sanityPatchWrapper(documentId, patchOps) {
    try {
        let patch = sanityClient_1.sanityClient.patch(documentId);
        if (patchOps.set) patch = patch.set(patchOps.set);
        if (patchOps.unset) patch = patch.unset(patchOps.unset);
        if (patchOps.setIfMissing) patch = patch.setIfMissing(patchOps.setIfMissing);
        if (patchOps.inc) patch = patch.inc(patchOps.inc);
        if (patchOps.dec) patch = patch.dec(patchOps.dec);
        if (patchOps.insert) {
            patch = patch.insert(
                patchOps.insert.at,
                patchOps.insert.selector,
                patchOps.insert.items
            );
        }
        if (patchOps.append) {
            patch = patch.append(patchOps.append.selector, patchOps.append.items);
        }
        if (patchOps.prepend) {
            patch = patch.prepend(patchOps.prepend.selector, patchOps.prepend.items);
        }
        const result = await patch.commit();
        return result;
    } catch (error) {
        console.error("Sanity patch error:", error);
        const sanityError = new Error(
            error instanceof Error ? error.message : "Sanity patch failed"
        );
        sanityError.name = "SanityPatchError";
        sanityError.status = 500;
        sanityError.data = error;
        throw sanityError;
    }
}
