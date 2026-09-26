import { defineWebComponent } from '../define/define';
import { FileUpload, FileUploadTrigger } from '../../components/file/file-upload';
import { Upload } from 'lucide-solid';

interface Props extends Record<string, unknown> {
  /** Allow picking more than one file. Default true. */
  multiple?: boolean;
  /** `accept` for the file picker, e.g. `image/*`. */
  accept?: string;
  /** No clicking and no drag-and-drop. */
  disabled?: boolean;
  /** Default dropzone label; replace it with your own markup via the default slot. */
  label?: string;
}

/** Events fired by `<kai-file-upload>`. */
interface Events {
  /** Files were picked or dropped. */
  'kai-files-added': { files: File[] };
}

/**
 * A dropzone for picking files or dropping them in.
 */
defineWebComponent<Props, Events>('kai-file-upload', {
  multiple: true,
  accept: undefined,
  disabled: false,
  label: 'Click or drop files to upload',
}, (props, { dispatch, flag }) => (
  <FileUpload
    multiple={flag('multiple')}
    accept={props.accept}
    disabled={flag('disabled')}
    onFilesAdded={(files) => dispatch('kai-files-added', { files })}
  >
    <FileUploadTrigger class="border-border bg-surface hover:bg-muted/60 text-muted-foreground flex w-full cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-dashed px-6 py-8 text-sm transition-colors">
      <Upload class="size-5" />
      <slot>{props.label}</slot>
    </FileUploadTrigger>
  </FileUpload>
));
