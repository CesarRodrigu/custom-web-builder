/**
 * Shared remove product control: a trigger button that opens the confirmation
 * alert dialog used everywhere a product can be deleted, so the product page
 * and the sidebar file tree keep the same flow and the same copy.
 */
import type { ReactElement } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import type { BuilderTexts } from "@/features/builder/builder-texts";

/** Props of the shared remove product control. */
interface RemoveProductButtonProps {
  /** Localized strings; the only difference between locales. */
  texts: BuilderTexts;
  /** Called when the user confirms the deletion. */
  onRemove: () => void;
  /** Element that opens the confirmation dialog, usually a button. */
  trigger: ReactElement;
}

/**
 * Renders the given trigger wrapped in the remove product alert dialog, with
 * the cancel action and the destructive confirm action that runs `onRemove`.
 * @param props Localized strings, the deletion callback and the trigger element.
 * @returns The trigger plus its confirmation dialog markup.
 */
export function RemoveProductButton(props: Readonly<RemoveProductButtonProps>) {
  const { texts, onRemove, trigger } = props;
  return (
    <AlertDialog>
      <AlertDialogTrigger render={trigger} />
      <AlertDialogContent size="sm">
        <AlertDialogHeader>
          <AlertDialogTitle>{texts.removeProductTitle}</AlertDialogTitle>
          <AlertDialogDescription>
            {texts.removeProductDescription}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel size="sm">
            {texts.removeProductCancel}
          </AlertDialogCancel>
          <AlertDialogAction size="sm" variant="destructive" onClick={onRemove}>
            {texts.removeProductRemove}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export default RemoveProductButton;
