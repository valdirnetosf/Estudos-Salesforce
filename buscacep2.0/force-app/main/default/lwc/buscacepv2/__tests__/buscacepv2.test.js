import { createElement } from '@lwc/engine-dom';
import Buscacepv2 from 'c/buscacepv2';

describe('c-buscacepv2', () => {
    afterEach(() => {
        // The jsdom instance is shared across test cases in a single file so reset the DOM
        while (document.body.firstChild) {
            document.body.removeChild(document.body.firstChild);
        }
    });

    it('renders operation mode selector and defaults to Apex', () => {
        // Arrange
        const element = createElement('c-buscacepv2', {
            is: Buscacepv2
        });

        // Act
        document.body.appendChild(element);

        // Assert
        const modoOperacao = element.shadowRoot.querySelector('lightning-combobox[name="modoOperacao"]');
        expect(modoOperacao).not.toBeNull();
        expect(modoOperacao.value).toBe('apex');
    });
});