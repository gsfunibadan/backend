import { createClient } from "@sanity/client";
import imageUrlBuilder from "@sanity/image-url";
import { SanityAsset } from "@sanity/image-url/lib/types/types";
import { env } from "../../config/enviroment";
export const sanityClient = createClient({
    projectId: "276it5za",

    dataset: process.env.NODE_ENV === "production" ? "production" : "development",
    useCdn: false,
    apiVersion: "2025-04-01",
    //No be my fault, i no wan make am public, but it has to be public to be used on the frontend frontend  😿 😿 😿
    token: env.SANITY_TOKEN,

    // I don't want either prisma or sanity caching for me, imagine next.js caching is enough problems, switching between too many caching contexts becomes problematic walahi
});
const builder = imageUrlBuilder(sanityClient);
export const urlFor = (source: SanityAsset) => builder.image(source);
