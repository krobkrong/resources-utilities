import Resolver from "enhanced-resolve/lib/Resolver"
import { SyncHook, AsyncSeriesBailHook, Hook } from "tapable";
import { LoggingCallbackWrapper, ResolverRequest } from "enhanced-resolve/lib/common-types";

export declare class ExtResolver extends Resolver {

   hooks: {
      noResolve: SyncHook
      resolve: AsyncSeriesBailHook
      undescribedRawFile: AsyncSeriesBailHook
      describedResolve: AsyncSeriesBailHook
   }

   getHook(name: string): Hook
   ensureHook(name: string): Hook

   /** ignore to override the library definition, the library itself is not update at the moment */
   //@ts-ignore
   doResolve(hooks: Hook, req: ResolverRequest, message: string, log: LoggingCallbackWrapper): any;

}