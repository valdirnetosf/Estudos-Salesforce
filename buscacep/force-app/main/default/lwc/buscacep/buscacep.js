import { LightningElement, track } from 'lwc';

export default class BuscaCep extends LightningElement {
    @track cep = '';
    @track rua = '';
    @track enderecos = null;
    @track cidade = '';
    @track uf = '';

    handleCepChange(event) {
        this.cep = event.target.value;
    }

    handleRuaChange(event) {
        this.rua = event.target.value;
    }

    handleCidadeChange(event) {
        this.cidade = event.target.value;
    }

    handleUfChange(event) {
        this.uf = event.target.value;
    }

    handleKeyDown(event) {
        if (event.key === 'Enter') {
            this.handleBuscar();
        }
    }

    handleBuscar() {
        if (this.cep) {
            this.buscarPorCep();
        } else if (this.rua) {
            this.buscarPorRua();
        }
    }

    async buscarPorCep() {
        if (!this.cep) {
            alert('Preencha o CEP.');
            return;
        }

        const response = await fetch(`https://viacep.com.br/ws/${this.cep}/json/`);
        const data = await response.json();

        if (data.erro) {
            alert('CEP não encontrado.');
            this.enderecos = null;
        } else {
            this.enderecos = [data];
        }
    }

    async buscarPorRua() {
        if (!this.uf || !this.cidade || !this.rua) {
            alert('Preencha o estado, a cidade e o nome da rua.');
            return;
        }

        const response = await fetch(`https://viacep.com.br/ws/${this.uf}/${this.cidade}/${this.rua}/json/`);
        const data = await response.json();

        if (!Array.isArray(data) || data.length === 0) {
            alert('Nenhum endereço encontrado.');
            this.enderecos = null;
        } else {
            this.enderecos = data;
        }
    }
}