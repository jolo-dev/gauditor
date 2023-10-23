/**
 * The function `throwExpression` throws an error with the provided error message.
 * @param errorMessage - A string that represents the error message to be thrown.
 */
export function throwExpression(errorMessage: string): never {
  throw new Error(errorMessage);
}
