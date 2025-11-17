"use strict";
var __importDefault =
    (this && this.__importDefault) ||
    function (mod) {
        return mod && mod.__esModule ? mod : { default: mod };
    };
Object.defineProperty(exports, "__esModule", { value: true });
exports.urlFor = exports.sanityClient = void 0;
const client_1 = require("@sanity/client");
const image_url_1 = __importDefault(require("@sanity/image-url"));
const enviroment_1 = require("../../config/enviroment");
exports.sanityClient = (0, client_1.createClient)({
    projectId: "276it5za",
    dataset: process.env.NODE_ENV === "production" ? "production" : "development",
    useCdn: false,
    apiVersion: "2025-04-01",
    //No be my fault, i no wan make am public, but it has to be public to be used on the frontend frontend  😿 😿 😿
    token: enviroment_1.env.SANITY_TOKEN,
    // I don't want either prisma or sanity caching for me, imagine next.js caching is enough problems, switching between too many caching contexts becomes problematic walahi
});
const builder = (0, image_url_1.default)(exports.sanityClient);
const urlFor = (source) => builder.image(source);
exports.urlFor = urlFor;
