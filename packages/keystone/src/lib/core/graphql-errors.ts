import { ApolloError } from 'apollo-server-errors';

// KS_USER_INPUT_ERROR      1
// KS_ACCESS_DENIED_ERROR   1
// KS_PRISMA_ERROR          1
// KS_LIMITS_EXCEEDED_ERROR 1
// KS_VALIDATION_ERROR      1/N
// KS_EXTENSION_ERROR       1/N
// KS_SYSTEM_ERROR          N
// KS_RELATIONSHIP_ERROR    N

export const userInputError = (msg: string) =>
  new ApolloError(`Input error: ${msg}`, 'KS_USER_INPUT_ERROR');

export const accessDeniedError = () =>
  new ApolloError('You do not have access to this resource', 'KS_ACCESS_DENIED');

// FIXME: We lose a lot of useful context from the error
export const prismaError = (msg: string) =>
  new ApolloError(`Prisma error: ${msg}`, 'KS_PRISMA_ERROR');

export const limitsExceededError = ({
  listKey,
  type,
  limit,
}: {
  listKey: string;
  type: 'maxResults' | 'maxTotalResults';
  limit: number;
}) =>
  new ApolloError(
    `Your request exceeded server limits. '${listKey}' has ${type} limit of ${limit}`,
    'KS_LIMITS_EXCEEDED_ERROR'
  );

// FIXME: We should make it easier to know which phase of validation a thing happened at
export const validationFailureError = (messages: string[]) => {
  const s = messages.map(m => `  - ${m}`).join('\n');
  return new ApolloError(
    `You provided invalid data for this operation.\n${s}`,
    'KS_VALIDATION_ERROR'
  );
};

export const extensionError = (extension: string, things: { error: Error; tag: string }[]) => {
  const s = things.map(t => `  - ${t.tag}: ${t.error.message}`).join('\n');
  return new ApolloError(
    `An error occured while running "${extension}".\n${s}`,
    'KS_EXTENSION_ERROR',
    // Make the original stack traces available.
    { debug: things.map(t => ({ stacktrace: t.error.stack, message: t.error.message })) }
  );
};

export const systemError = (messages: string[]) => {
  const s = messages.map(m => `  - ${m}`).join('\n');
  return new ApolloError(`System error:\n${s}`, 'KS_SYSTEM_ERROR');
};

export const relationshipError = (messages: string[]) => {
  const s = messages.map(m => `  - ${m}`).join('\n');
  return new ApolloError(`Relationship error:\n${s}`, 'KS_RELATIONSHIP_ERROR');
};

type Awaited<T> = T extends PromiseLike<infer U> ? U : T;

// these aren't here out of thinking this is better syntax(i do not think it is),
// it's just because TS won't infer the arg is X bit
export const isFulfilled = <T>(arg: PromiseSettledResult<T>): arg is PromiseFulfilledResult<T> =>
  arg.status === 'fulfilled';

export const isRejected = (arg: PromiseSettledResult<any>): arg is PromiseRejectedResult =>
  arg.status === 'rejected';

export async function promiseAllRejectWithExtensionError<T extends unknown[]>(
  hookName: string,
  promises: readonly [...T]
): Promise<{ [P in keyof T]: Awaited<T[P]> }> {
  const results = await Promise.allSettled(promises);
  if (results.every(isFulfilled)) {
    return results.map((x: any) => x.value) as any;
  } else {
    throw extensionError(
      hookName,
      results.filter(isRejected).map(x => x.reason.message)
    );
  }
}

export async function promiseAllRejectWithRelationshipError<T extends unknown[]>(
  promises: readonly [...T]
): Promise<{ [P in keyof T]: Awaited<T[P]> }> {
  const results = await Promise.allSettled(promises);
  if (results.every(isFulfilled)) {
    return results.map((x: any) => x.value) as any;
  } else {
    throw relationshipError(results.filter(isRejected).map(x => x.reason.message));
  }
}

export async function promiseAllRejectWithSystemError<T extends unknown[]>(
  promises: readonly [...T]
): Promise<{ [P in keyof T]: Awaited<T[P]> }> {
  const results = await Promise.allSettled(promises);
  if (results.every(isFulfilled)) {
    return results.map((x: any) => x.value) as any;
  } else {
    throw systemError(results.filter(isRejected).map(x => x.reason.message));
  }
}
