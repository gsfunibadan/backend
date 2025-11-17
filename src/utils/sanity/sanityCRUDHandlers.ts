import { sanityClient } from "./sanityClient";
import { SanityDocument } from "@sanity/client";

export interface ClientError extends Error {
    status?: number;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    data?: any;
}
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function sanityFetchWrapper<T = any>(
    query: string,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    params: Record<string, any> = {}
): Promise<T> {
    try {
        const result = await sanityClient.fetch(query, params);
        return result;
    } catch (error) {
        console.error("Sanity fetch error:", error);

        const sanityError: ClientError = new Error(
            error instanceof Error ? error.message : "Sanity query failed"
        );
        sanityError.name = "SanityError";
        sanityError.status = 500;
        sanityError.data = error;

        throw sanityError;
    }
}

export async function sanityCreateWrapper<T = SanityDocument>(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    document: { _type: string; [key: string]: any },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    options?: Record<string, any>
): Promise<T> {
    try {
        const result = await sanityClient.create(document, options);
        return result as T;
    } catch (error) {
        console.error("Sanity create error:", error);

        const sanityError: ClientError = new Error(
            error instanceof Error ? error.message : "Sanity create failed"
        );
        sanityError.name = "SanityCreateError";
        sanityError.status = 500;
        sanityError.data = error;

        throw sanityError;
    }
}
export async function sanityPatchWrapper<T = SanityDocument>(
    documentId: string,
    patchOps: {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        set?: Record<string, any>;
        unset?: string[];
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        setIfMissing?: Record<string, any>;
        inc?: Record<string, number>;
        dec?: Record<string, number>;
        insert?: {
            at: "before" | "after" | "replace";
            selector: string;
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            items: any[];
        };
        append?: {
            selector: string;
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            items: any[];
        };
        prepend?: {
            selector: string;
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            items: any[];
        };
    }
): Promise<T> {
    try {
        let patch = sanityClient.patch(documentId);

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
        return result as T;
    } catch (error) {
        console.error("Sanity patch error:", error);

        const sanityError: ClientError = new Error(
            error instanceof Error ? error.message : "Sanity patch failed"
        );
        sanityError.name = "SanityPatchError";
        sanityError.status = 500;
        sanityError.data = error;

        throw sanityError;
    }
}
