import Modal from './ui/Modal'
import Button from './ui/Button'

export default function ConfirmDialog({ open, title = 'Are you sure?', message, onConfirm, onCancel }) {
  return (
    <Modal
      open={open}
      onClose={onCancel}
      title={title}
      footer={
        <>
          <Button variant="secondary" onClick={onCancel}>
            Cancel
          </Button>
          <Button variant="danger" onClick={onConfirm}>
            Delete
          </Button>
        </>
      }
    >
      {message}
    </Modal>
  )
}
