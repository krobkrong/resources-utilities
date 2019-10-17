import { LoggingCallbackWrapper, ResolverRequest } from "enhanced-resolve/lib/common-types";
import Resolver from "enhanced-resolve/lib/Resolver";
import { AsyncSeriesBailHook, Hook, SyncHook } from "tapable";

export declare class ExtResolver extends Resolver {

   public hooks: {
      noResolve: SyncHook
      resolve: AsyncSeriesBailHook
      undescribedRawFile: AsyncSeriesBailHook
      describedResolve: AsyncSeriesBailHook,
   };

   public getHook(name: string): Hook;
   public ensureHook(name: string): Hook;

   /** ignore to override the library definition, the library itself is not update at the moment */
   // @ts-ignore
   public doResolve(hooks: Hook, req: ResolverRequest, message: string, log: LoggingCallbackWrapper): any;

}
