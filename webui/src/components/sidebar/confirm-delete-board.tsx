import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "../ui/alert-dialog"


/**
 * Properties for the ConfirmDeleteBoardAlert component.
 *
 * @property {boolean} open - Indicates whether the alert dialog is open.
 * @property {(open: boolean) => void} onOpenChange - Callback function to handle changes in the open state.
 * @property {() => void} onConfirm - Callback function to handle the confirmation action.
 * @property {string} [title] - Optional title for the alert dialog.
 * @property {string} [description] - Optional description for the alert dialog.
 */
type ConfirmDeleteBoardAlertProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: () => void
  title?: string
  description?: string
}


/**
 * ConfirmDeleteBoardAlert component displays a confirmation dialog for deleting a board.
 *
 * @param {ConfirmDeleteBoardAlertProps} props - The properties for the component.
 * @returns {JSX.Element} The rendered ConfirmDeleteBoardAlert component.
 */
export function ConfirmDeleteBoardAlert({
  open,
  onOpenChange,
  onConfirm,
  title = "Delete this board?",
  description = "This will permanently delete this board and all its chats. This action cannot be undone.",
}: ConfirmDeleteBoardAlertProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>
            {description}
          </AlertDialogDescription>
        </AlertDialogHeader>

        <AlertDialogFooter>
          <AlertDialogCancel>
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            className="bg-destructive !text-destructive-foreground hover:bg-destructive/90"
          >
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}