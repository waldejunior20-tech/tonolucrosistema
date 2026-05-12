import { useMutation, UseMutationOptions } from "@tanstack/react-query";
import { toast } from "sonner";

interface ExtraOptions {
  successMessage?: string;
  errorMessage?: string;
}

export function useMutationWithToast<TData = unknown, TError = Error, TVariables = void, TContext = unknown>(
  options: UseMutationOptions<TData, TError, TVariables, TContext> & ExtraOptions
) {
  const {
    successMessage = "Salvo com sucesso!",
    errorMessage = "Erro ao salvar",
    onSuccess,
    onError,
    ...rest
  } = options;

  return useMutation<TData, TError, TVariables, TContext>({
    ...rest,
    onSuccess: (data, variables, context) => {
      toast.success(successMessage);
      onSuccess?.(data, variables, context);
    },
    onError: (error, variables, context) => {
      const msg = (error as Error)?.message ? `${errorMessage}: ${(error as Error).message}` : errorMessage;
      toast.error(msg);
      onError?.(error, variables, context);
    },
  });
}
