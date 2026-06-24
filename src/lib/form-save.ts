import { saveErrorMessage } from "@/lib/api-errors";

/** Run a save handler; toast success or the real API error message. */
export async function runFormSave(
  toast: (msg: string) => void,
  action: () => Promise<void>,
  successMessage: string,
): Promise<boolean> {
  try {
    await action();
    toast(successMessage);
    return true;
  } catch (error) {
    toast(saveErrorMessage(error));
    return false;
  }
}
