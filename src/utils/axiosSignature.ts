import axios, { AxiosInstance } from "axios";
import CryptoJS from "crypto-js";
import { v4 as uuidv4 } from "uuid";

export const getSignature = (rawData: string, token: string): string => {
    return CryptoJS.HmacSHA256(rawData, token).toString(CryptoJS.enc.Base64);
};

export function applyStandardInterceptors(axiosInstance: AxiosInstance | any, deviceId: string) {
    axiosInstance.interceptors.request.use(
        (config: any) => {
            const method = config.method ? config.method.toUpperCase() : "GET";

            config.headers = config.headers || {};
            const setHeader = (key: string, value: string) => {
                if (typeof config.headers.set === "function") {
                    config.headers.set(key, value);
                } else {
                    config.headers[key] = value;
                }
            };

            const readHeader = (name: string): string => {
                if (typeof config.headers.get === "function") {
                    const value = config.headers.get(name);
                    if (value != null) return String(value);
                }

                for (const key of Object.keys(config.headers)) {
                    if (key.toLowerCase() === name.toLowerCase()) {
                        const value = config.headers[key];
                        if (value != null) return String(value);
                    }
                }

                return "";
            };

            const deleteHeader = (name: string) => {
                if (typeof config.headers.delete === "function") {
                    config.headers.delete(name);
                }

                for (const key of Object.keys(config.headers)) {
                    if (key.toLowerCase() === name.toLowerCase()) {
                        delete config.headers[key];
                    }
                }
            };

            const sanitizeTransportHeaders = () => {
                deleteHeader("Content-Length");
                deleteHeader("Host");
                deleteHeader("Connection");
                deleteHeader("Transfer-Encoding");
            };

            const sanitizeOptionalHeaders = () => {
                for (const key of Object.keys(config.headers)) {
                    const value = config.headers[key];
                    if (value == null) {
                        deleteHeader(key);
                    }
                }
            };

            const resolveRequestPath = () => {
                let requestUrl = config.url || "";

                try {
                    if (typeof axiosInstance.getUri === "function") {
                        requestUrl = axiosInstance.getUri(config) || requestUrl;
                    } else if (typeof axios.getUri === "function") {
                        requestUrl = axios.getUri(config) || requestUrl;
                    }
                } catch {
                    // Fall back to the raw config URL when Axios cannot build the final URI.
                }

                try {
                    const urlObj = requestUrl.startsWith("http")
                        ? new URL(requestUrl)
                        : new URL(requestUrl, "https://signature.local");
                    return urlObj.pathname + urlObj.search;
                } catch {
                    return requestUrl;
                }
            };

            const hasHeader = (key: string) => {
                if (typeof config.headers.has === "function") {
                    return config.headers.has(key);
                }
                return !!config.headers[key];
            };

            const actualDeviceId = readHeader("X-Device-Id") || deviceId;

            sanitizeTransportHeaders();
            sanitizeOptionalHeaders();

            if (!hasHeader("X-Device-Id")) setHeader("X-Device-Id", actualDeviceId);
            if (!hasHeader("X-Client-Type")) setHeader("X-Client-Type", "web");
            if (!hasHeader("Accept-Language")) setHeader("Accept-Language", "vi");
            let body = "";
            const contentType = readHeader("Content-Type");

            if (contentType.includes("multipart/form-data")) {
                body = "";
            } else if (contentType.includes("application/json")) {
                if (config.data !== undefined && config.data !== null) {
                    if (method === "GET" && typeof config.data === "object" && Object.keys(config.data).length === 0) {
                        body = "";
                    } else {
                        body = typeof config.data === "string" ? config.data : JSON.stringify(config.data);
                    }
                }
            } else if (config.data && typeof config.data === "object") {

                if (config.data.constructor && config.data.constructor.name === "FormData") {
                    body = '';
                } else {
                    body = JSON.stringify(config.data);
                }
            } else if (config.data !== undefined && config.data !== null) {

                body = String(config.data);
            }

            const timestamp = Math.floor(Date.now() / 1000).toString();

            const authHeader = readHeader("Authorization");
            const path = resolveRequestPath();
            const signaturePath = config.__signaturePath
                || (config.__signatureExcludeQuery ? path.split("?")[0] : path);

            let token = "";
            if (authHeader && typeof authHeader === "string") {
                token = authHeader.replace(/^Bearer\s+/i, "").trim();
            }

            if (path.includes("/auth/") || path.includes("/password/")) {
                if (!path.includes("/refresh")) {
                    token = "";
                }
            }

            const rawData = method + "|" + signaturePath + "|" + timestamp + "|" + body;
            const signature = getSignature(rawData, token);

            setHeader("X-Timestamp", timestamp);
            setHeader("X-Signature", signature);
            if (!hasHeader("Idempotency-Key")) {
                setHeader("Idempotency-Key", String(uuidv4()));
            }

            return config;
        },
        (error: any) => Promise.reject(error)
    );
}

export function createSignedAxios(baseURL: string, deviceId: string) {
    const client = axios.create({ baseURL, timeout: 12000 });
    applyStandardInterceptors(client, deviceId);
    return client;
}
