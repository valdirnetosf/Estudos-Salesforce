
// Importações LWC e Apex

import { LightningElement, api } from 'lwc';

import buscarPorCep
from '@salesforce/apex/BuscaCepService.buscarPorCep';

import buscarPorEndereco
from '@salesforce/apex/BuscaCepService.buscarPorEndereco';

// Lista Estados

const UFS = [
    'AC','AL','AP','AM','BA','CE','DF','ES',
    'GO','MA','MT','MS','MG','PA','PB','PR',
    'PE','PI','RJ','RN','RS','RO','RR','SC',
    'SP','SE','TO'
];


// Classe Principal do Componente


export default class BuscaCep extends LightningElement {

    // Controles de Tela

    modoOperacao = 'apex';

    modoBusca = '';

    mostrarBlocoCep = false;

    mostrarBlocoEndereco = false;

   // Infos dadas pelo usuário

    cepDigitado = '';

    ruaDigitada = '';

    cidadeDigitada = '';

    ufSelecionada = '';

    // Outputs Flow

    @api flowCep = '';

    @api flowLogradouro = '';

    @api flowBairro = '';

    @api flowCidade = '';

    @api flowUf = '';

    // Resultados e erros

    enderecos = [];

    erro = '';

    _debounceTimer;

    // Configurações ComboBoxes

    get opcoesModoOperacao() {
        return [
            {
                label: 'Apex (back-end)',
                value: 'apex'
            },
            {
                label: 'JavaScript (LWC - fetch)',
                value: 'javascript'
            }
        ];
    }

    get opcoesModo() {

        return [
            {
                label: 'Buscar endereço por CEP',
                value: 'cep'
            },
            {
                label: 'Buscar CEP por endereço',
                value: 'endereco'
            }
        ];
    }

    get opcoesUF() {

        return UFS.map(
            uf => ({
                label: uf,
                value: uf
            })
        );
    }

    // Cnotroles de habilitação

    get podeBuscarPorEndereco() {

        return (
            this.ufSelecionada.length === 2 &&
            this.cidadeDigitada.length >= 3 &&
            this.ruaDigitada.length >= 3
        );
    }

    get notPodeBuscarPorEndereco() {

        return !this.podeBuscarPorEndereco;
    }

    get temEnderecos() {

        return (
            Array.isArray(this.enderecos) &&
            this.enderecos.length > 0
        );
    }

    // Sistema de troca de modos

    handleMudancaOperacao(event) {

        this.modoOperacao = event.detail.value;
    }

    handleMudancaModo(event) {

        this.modoBusca = event.detail.value;

        this.cepDigitado = '';
        this.ruaDigitada = '';
        this.cidadeDigitada = '';
        this.ufSelecionada = '';

        this.erro = '';

        this.enderecos = [];

        this.resetFlowOutputs();

        this.mostrarBlocoCep =
            this.modoBusca === 'cep';

        this.mostrarBlocoEndereco =
            this.modoBusca === 'endereco';
    }

    // Saídas do Flow

    resetFlowOutputs() {

        this.flowCep = '';
        this.flowLogradouro = '';
        this.flowBairro = '';
        this.flowCidade = '';
        this.flowUf = '';
    }

    setEnderecoParaFlow(endereco) {

        if (!endereco) {
            return;
        }

        this.flowCep =
            endereco.cep || '';

        this.flowLogradouro =
            endereco.logradouro || '';

        this.flowBairro =
            endereco.bairro || '';

        this.flowCidade =
            endereco.localidade || '';

        this.flowUf =
            endereco.uf || '';
    }

    // Seleção de endereço

    handleSelecionarEndereco(event) {

        const index =
            Number(
                event.currentTarget.dataset.index
            );

        const endereco =
            this.enderecos[index];

        if (endereco) {

            this.setEnderecoParaFlow(
                endereco
            );
        }
    }

    // Debounce

    debounce(fn, delay) {

        clearTimeout(
            this._debounceTimer
        );

        this._debounceTimer =
            setTimeout(fn, delay);
    }

    // Busca Cep

    async buscarPorCep() {

        this.erro = '';

        this.resetFlowOutputs();

        try {

            if (this.modoOperacao === 'apex') {

                const resultado = await buscarPorCep({
                    cep: this.cepDigitado
                });

                this.enderecos = resultado ? [resultado] : [];

                if (resultado) {
                    this.setEnderecoParaFlow(resultado);
                } else {
                    this.erro = 'CEP não encontrado.';
                }

            } else {

                const resultado = await this.buscarPorCepViaJs();

                this.enderecos = resultado ? [resultado] : [];

                if (resultado) {
                    this.setEnderecoParaFlow(resultado);
                } else {
                    this.erro = 'CEP não encontrado.';
                }
            }

        } catch (error) {

            this.enderecos = [];

            this.erro =
                error?.body?.message ||
                error?.message ||
                'Erro ao buscar CEP.';
        }
    }

    async buscarPorCepViaJs() {

        const cep = this.cepDigitado;

        try {
            const res = await fetch(`https://viacep.com.br/ws/${encodeURIComponent(cep)}/json/`);

            if (!res.ok) {
                throw new Error('Erro na requisição ViaCEP');
            }

            const data = await res.json();

            if (data.erro) {
                return null;
            }

            return {
                cep: (data.cep || '').replace('-', ''),
                logradouro: data.logradouro || '',
                bairro: data.bairro || '',
                localidade: data.localidade || '',
                uf: data.uf || ''
            };

        } catch (err) {
            throw err;
        }
    }

    // Busca Endereço

    async buscarPorEndereco() {

        this.erro = '';

        this.resetFlowOutputs();

        try {

            if (this.modoOperacao === 'apex') {

                const resultado = await buscarPorEndereco({
                    uf: this.ufSelecionada,
                    cidade: this.cidadeDigitada,
                    rua: this.ruaDigitada
                });

                this.enderecos = resultado || [];

            } else {

                const resultado = await this.buscarPorEnderecoViaJs();

                this.enderecos = resultado || [];
            }

            if (!this.enderecos.length) {

                this.erro = 'Nenhum endereço encontrado.';

            } else if (this.enderecos.length === 1) {

                this.setEnderecoParaFlow(this.enderecos[0]);
            }

        } catch (error) {

            this.enderecos = [];

            this.erro =
                error?.body?.message ||
                error?.message ||
                'Erro ao buscar endereço.';
        }
    }

    async buscarPorEnderecoViaJs() {

        const uf = this.ufSelecionada;
        const cidade = this.cidadeDigitada;
        const rua = this.ruaDigitada;

        try {
            const url = `https://viacep.com.br/ws/${encodeURIComponent(uf)}/${encodeURIComponent(cidade)}/${encodeURIComponent(rua)}/json/`;

            const res = await fetch(url);

            if (!res.ok) {
                throw new Error('Erro na requisição ViaCEP');
            }

            const data = await res.json();

            if (!Array.isArray(data)) {
                return [];
            }

            return data.map(d => ({
                cep: (d.cep || '').replace('-', ''),
                logradouro: d.logradouro || '',
                bairro: d.bairro || '',
                localidade: d.localidade || '',
                uf: d.uf || ''
            }));

        } catch (err) {
            throw err;
        }
    }

    // =================================================
    // CEP
    // =================================================

    handleCepChange(event) {

        this.cepDigitado =
            event.detail.value
                .replace(/\D/g, '')
                .substring(0, 8);

        this.debounce(() => {

            if (
                this.cepDigitado.length === 8
            ) {

                this.buscarPorCep();
            }

        }, 500);
    }

    handleCepKeyDown(event) {

        if (event.key === 'Enter') {

            this.handleBuscarCep();
        }
    }

    handleBuscarCep() {

        if (
            this.cepDigitado.length === 8
        ) {

            this.buscarPorCep();

        } else {

            this.erro =
                'Digite um CEP válido.';
        }
    }

    // =================================================
    // ENDEREÇO
    // =================================================

    handleRuaChange(event) {

        this.ruaDigitada =
            event.detail.value;

        if (
            this.podeBuscarPorEndereco
        ) {

            this.debounce(() => {

                this.buscarPorEndereco();

            }, 700);
        }
    }

    handleCidadeChange(event) {

        this.cidadeDigitada =
            event.detail.value;

        if (
            this.podeBuscarPorEndereco
        ) {

            this.debounce(() => {

                this.buscarPorEndereco();

            }, 700);
        }
    }

    handleUFChange(event) {

        this.ufSelecionada =
            event.detail.value;

        if (
            this.podeBuscarPorEndereco
        ) {

            this.debounce(() => {

                this.buscarPorEndereco();

            }, 700);
        }
    }

    handleEnderecoKeyDown(event) {

        if (
            event.key === 'Enter' &&
            this.podeBuscarPorEndereco
        ) {

            this.handleBuscarEndereco();
        }
    }

    handleBuscarEndereco() {

        if (
            this.podeBuscarPorEndereco
        ) {

            this.buscarPorEndereco();
        }
    }
}
