import { ClientRefusal } from "@/types/auth";

export interface RefusalParams {
  code: string;
  whatHappened: string;
  why: string;
  howToResolve: string;
  whereToGo: {
    label: string;
    url: string;
  };
}

/**
 * Constructs an explicit, helpful client refusal adhering to Non-Negotiable Rule 6:
 * Every refusal states what happened, why, what resolves it, and where to go.
 */
export function createClientRefusal(params: RefusalParams): ClientRefusal {
  if (!params.whatHappened || !params.why || !params.howToResolve || !params.whereToGo?.url) {
    throw new Error("Client refusal must include what happened, why, how to resolve, and a destination link.");
  }

  return {
    success: false,
    code: params.code,
    whatHappened: params.whatHappened,
    why: params.why,
    howToResolve: params.howToResolve,
    whereToGo: {
      label: params.whereToGo.label,
      url: params.whereToGo.url,
    },
  };
}

export function isClientRefusal(response: unknown): response is ClientRefusal {
  if (!response || typeof response !== "object") return false;
  const r = response as Record<string, unknown>;
  return (
    r.success === false &&
    typeof r.whatHappened === "string" &&
    typeof r.why === "string" &&
    typeof r.howToResolve === "string" &&
    typeof r.whereToGo === "object" &&
    r.whereToGo !== null
  );
}
