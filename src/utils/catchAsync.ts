import { NextFunction, Request, Response, RequestHandler } from "express";

type CatchAsyncFunction<TReq extends Request = Request> = (
    req: TReq,
    res: Response,
    next: NextFunction
) => Promise<Response | void>;

export const catchAsync = <TReq extends Request = Request>(
    fn: CatchAsyncFunction<TReq>
): RequestHandler => {
    return (req: Request, res: Response, next: NextFunction) => {
        fn(req as TReq, res, next).catch(next);
    };
};
