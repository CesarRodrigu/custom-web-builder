/**
 * Shared remove folder control: a trigger button that opens the confirmation
 * alert dialog used wherever a user created folder can be deleted. Deleting a
 * folder never destroys products, they return to the products root, but the
 * confirmation makes the structural change explicit.
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

/** Props of the shared remove folder control. */
interface RemoveFolderButtonProps {
  /** Localized strings; the only difference between locales. */
  texts: BuilderTexts;
  /** Called when the user confirms the deletion. */
  onRemove: () => void;
  /** Element that opens the confirmation dialog, usually a button. */
  trigger: ReactElement;
}

/**
 * Renders the given trigger wrapped in the remove folder alert dialog, with
 * the cancel action and the destructive confirm action that runs `onRemove`.
 * @param props Localized strings, the deletion callback and the trigger element.
 * @returns The trigger plus its confirmation dialog markup.
 */
export function RemoveFolderButton(props: Readonly<RemoveFolderButtonProps>) {
  const { texts, onRemove, trigger } = props;
  return (
    <AlertDialog>
      <AlertDialogTrigger render={trigger} />
      <AlertDialogContent size="sm">
        <AlertDialogHeader>
          <AlertDialogTitle>{texts.removeFolderTitle}</AlertDialogTitle>
          <AlertDialogDescription>
            {texts.removeFolderDescription}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel size="sm">
            {texts.removeFolderCancel}
          </AlertDialogCancel>
          <AlertDialogAction size="sm" variant="destructive" onClick={onRemove}>
            {texts.removeFolderRemove}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export default RemoveFolderButton;
