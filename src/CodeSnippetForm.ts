
import { Widget } from '@lumino/widgets';
import { RequestHandler } from '@elyra/application';

import checkSVGstr from '../style/check.svg';
import { showMessage } from './ConfirmMessage';

import { Dialog, showDialog} from '@jupyterlab/apputils';

import { Contents } from '@jupyterlab/services';

import { JSONObject } from '@lumino/coreutils';

import {ICodeSnippet} from './CodeSnippetService'

import { IDocumentManager } from '@jupyterlab/docmanager';
import { CodeSnippetWidget } from './CodeSnippetWidget';

/**
 * The class name added to file dialogs.
 */
const FILE_DIALOG_CLASS = 'jp-FileDialog';

/**
 * The class name added for the new name label in the rename dialog
 */
const INPUT_NEWNAME_TITLE_CLASS = 'jp-new-name-title';

/**
 * A stripped-down interface for a file container.
 */
export interface IFileContainer extends JSONObject {
  /**
   * The list of item names in the current working directory.
   */
  items: string[];
  /**
   * The current working directory of the file container.
   */
  path: string;
}

/**
 * Save an input with a dialog. This is what actually displays everything. 
 * Result.value is the value retrieved from .getValue(). ---> .getValue() returns an array of inputs.
 */
export function inputDialog(
  codeSnippet: CodeSnippetWidget,
  url: string,
  inputCode: string
): Promise<Contents.IModel | null> {
  return showDialog({
    title: 'Save Code Snippet',
    body: new InputHandler(),
    focusNodeSelector: 'input',
    buttons: [Dialog.cancelButton(), Dialog.okButton({ label: 'Save' })]
  }).then(result => {
    console.log(result.value);
    if (!result.value) {
      return null;
    }
    else {
      /* TODO: if name is already there call shouldOverwrite and change to a put request*/
      // Workaround: make a get request with result.value[0] to check... but could be slow
      RequestHandler.makePostRequest(  //If i use their handler then I can't interrupt any error messages without editing their stuff.
      url,
      JSON.stringify({ 
        display_name: result.value[0],
        metadata: {
            code: [
              inputCode
            ],
            description: result.value[1],
            language: result.value[2],
        },
        name: result.value[0].replace(' ','').toLowerCase(),
        schema_name: "code-snippet",
      }),
      false
      );
      codeSnippet.fetchData().then((codeSnippets: ICodeSnippet[]) => {
        console.log("HELLLO");
        codeSnippet.renderCodeSnippetsSignal.emit(codeSnippets)});
      showMessage({
        body: /*"Saved as Snippet"*/new MessageHandler()
        });
    }
    // if (!isValidFileName(result.value)) {
    //   void showErrorMessage(
    //     'Rename Error',
    //     Error(
    //       `"${result.value}" is not a valid name for a file. ` +
    //         `Names must have nonzero length, ` +
    //         `and cannot include "/", "\\", or ":"`
    //     )
    //   );
    //   return null;
    // }
    //const basePath = PathExt.dirname(oldPath);
    //const newPath = PathExt.join(basePath, result.value);
  });
}

/**
 * Rename a file, asking for confirmation if it is overwriting another.
 */
export function renameFile(
  manager: IDocumentManager,
  oldPath: string,
  newPath: string
): Promise<Contents.IModel | null> {
  return manager.rename(oldPath, newPath).catch(error => {
    if (error.message.indexOf('409') === -1) {
      throw error;
    }
    return shouldOverwrite(newPath).then(value => {
      if (value) {
        return manager.overwrite(oldPath, newPath);
      }
      return Promise.reject('File not renamed');
    });
  });
}

/**
 * Ask the user whether to overwrite a file.
 */
export function shouldOverwrite(path: string): Promise<boolean> {
  const options = {
    title: 'Overwrite file?',
    body: `"${path}" already exists, overwrite?`,
    buttons: [Dialog.cancelButton(), Dialog.warnButton({ label: 'Overwrite' })]
  };
  return showDialog(options).then(result => {
    return Promise.resolve(result.button.accept);
  });
}

/**
 * Test whether a name is a valid file name
 *
 * Disallows "/", "\", and ":" in file names, as well as names with zero length.
 */
export function isValidFileName(name: string): boolean {
  const validNameExp = /[\/\\:]/;
  return name.length > 0 && !validNameExp.test(name);
}

/**
 * A widget used to get input data.
 */
class InputHandler extends Widget {
  /**
   * Construct a new "rename" dialog.
   * readonly inputNode: HTMLInputElement; <--- in Widget class
   */
  constructor() {
    super({ node: Private.createInputNode() });
    this.addClass(FILE_DIALOG_CLASS);
  }

  getValue(): string[] {
    let inputs = [];
    inputs.push((this.node.getElementsByTagName('input')[0] as HTMLInputElement).value, 
    (this.node.getElementsByTagName('input')[1] as HTMLInputElement).value,
    (this.node.getElementsByTagName('input')[2] as HTMLInputElement).value);
    return inputs;
  }
}


class MessageHandler extends Widget {
    constructor() {
      super({ node: Private.createConfirmMessageNode() });
    }
  }  

/**
 * A namespace for private data.
 */
namespace Private {
  /**
   * Create the node for a rename handler. This is what's creating all of the elements to be displayed.
   */
  export function createInputNode(): HTMLElement {
    const body = document.createElement('div');

    const nameTitle = document.createElement('label');
    nameTitle.textContent = 'Snippet Name*';
    nameTitle.className = INPUT_NEWNAME_TITLE_CLASS;
    const name = document.createElement('input');
    
    const descriptionTitle = document.createElement('label');
    descriptionTitle.textContent = 'Description*';
    descriptionTitle.className = INPUT_NEWNAME_TITLE_CLASS;
    const description = document.createElement('input');

    const languageTitle = document.createElement('label');
    languageTitle.textContent = 'Language*';
    languageTitle.className = INPUT_NEWNAME_TITLE_CLASS;
    const language = document.createElement('input');

    body.appendChild(nameTitle);
    body.appendChild(name);
    body.appendChild(descriptionTitle);
    body.appendChild(description);
    body.appendChild(languageTitle);
    body.appendChild(language);
    return body;
  }

  export function createConfirmMessageNode(): HTMLElement {
    const body = document.createElement('div');
    body.innerHTML = checkSVGstr;

    const messageContainer = document.createElement('div');
    messageContainer.className = 'jp-confirm-text';
    const message = document.createElement('text');
    message.textContent = 'Saved as Snippet!';
    messageContainer.appendChild(message)
    body.append(messageContainer);
    return body;
  }
}