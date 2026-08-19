declare module "next" {
  export type Metadata = {
    title?: string | { default?: string; template?: string };
    description?: string;
    [key: string]: any;
  };
  export type Viewport = {
    width?: string | number;
    initialScale?: number;
    maximumScale?: number;
    userScalable?: boolean;
    themeColor?: string | { media?: string; color: string }[];
    [key: string]: any;
  };
  export type NextPage<P = {}, IP = P> = React.ComponentType<P>;
  export type NextConfig = {
    reactStrictMode?: boolean;
    [key: string]: any;
  };
  const next: any;
  export default next;
}

declare module "next/font/google" {
  export function Inter(options?: any): { className: string; variable: string; style: any };
  export function JetBrains_Mono(options?: any): { className: string; variable: string; style: any };
  export function Roboto_Mono(options?: any): { className: string; variable: string; style: any };
}

declare module "next/link" {
  import React from "react";
  export interface LinkProps extends React.AnchorHTMLAttributes<HTMLAnchorElement> {
    href: string;
    as?: string;
    replace?: boolean;
    scroll?: boolean;
    shallow?: boolean;
    passHref?: boolean;
    prefetch?: boolean;
    locale?: string | false;
  }
  const Link: React.ForwardRefExoticComponent<LinkProps & React.RefAttributes<HTMLAnchorElement>>;
  export default Link;
}

declare module "next/navigation" {
  export function useRouter(): {
    push(href: string, options?: any): void;
    replace(href: string, options?: any): void;
    refresh(): void;
    back(): void;
    forward(): void;
    prefetch(href: string): void;
  };
  export function usePathname(): string;
  export function useSearchParams(): URLSearchParams;
  export function useParams<T = any>(): T;
  export function redirect(url: string, type?: any): never;
  export function notFound(): never;
}

declare module "next/headers" {
  export function cookies(): Promise<{
    getAll(): { name: string; value: string }[];
    set(name: string, value: string, options?: any): void;
    delete(name: string): void;
    get(name: string): { name: string; value: string } | undefined;
    [key: string]: any;
  }> | {
    getAll(): { name: string; value: string }[];
    set(name: string, value: string, options?: any): void;
    delete(name: string): void;
    get(name: string): { name: string; value: string } | undefined;
    [key: string]: any;
  };
  export function headers(): Promise<Headers> | Headers;
}

declare module "next/cache" {
  export function revalidatePath(originalPath: string, type?: "layout" | "page"): void;
  export function revalidateTag(tag: string): void;
  export function unstable_cache<T extends (...args: any[]) => Promise<any>>(
    cb: T,
    keyParts?: string[],
    options?: { revalidate?: number | false; tags?: string[] }
  ): T;
}

declare module "next/dist/lib/metadata/types/metadata-interface.js" {
  export type ResolvingMetadata = any;
  export type ResolvingViewport = any;
}

declare module "next/types.js" {
  export type ResolvingMetadata = any;
  export type ResolvingViewport = any;
}

declare module "next/server" {
  export interface NextRequest extends Request {
    [key: string]: any;
  }
  export class NextResponse extends Response {
    static json(data: any, init?: ResponseInit): NextResponse;
    static redirect(url: string | URL, status?: number): NextResponse;
    static next(init?: any): NextResponse;
    static rewrite(destination: string | URL, init?: any): NextResponse;
  }
}

declare module "next/server.js" {
  export interface NextRequest extends Request {
    [key: string]: any;
  }
  export class NextResponse extends Response {
    static json(data: any, init?: ResponseInit): NextResponse;
    static redirect(url: string | URL, status?: number): NextResponse;
    static next(init?: any): NextResponse;
    static rewrite(destination: string | URL, init?: any): NextResponse;
  }
}
