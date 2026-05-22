//IMPORTS 
import { LightningElement } from 'lwc';
import buscarPorCep from '@salesforce/apex/BuscaCepService.buscarPorCep';
import buscarPorEndereco from '@salesforce/apex/BuscaCepService.buscarPorEndereco';


//CONSTANTES 

const UFS = [
    'AC','AL','AP','AM','BA','CE','DF','ES','GO','MA',
    'MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN',
    'RS','RO','RR','SC','SP','SE','TO'
];

const LOCAL_ADDRESS_DATA = [
    {
        cep: '01310-100',
        logradouro: 'Avenida Paulista',
        bairro: 'Bela Vista',
        localidade: 'São Paulo',
        uf: 'SP',
        cidade: 'São Paulo',
        rua: 'Avenida Paulista'
    },
    {
        cep: '20040002',
        logradouro: 'Rua Uruguaiana',
        bairro: 'Centro',
        localidade: 'Rio de Janeiro',
        uf: 'RJ',
        cidade: 'Rio de Janeiro',
        rua: 'Rua Uruguaiana'
    }
];

//CLASSE 
export default class BuscaCep extends LightningElement {


    //PROPRIEDADES REATIVAS 
    //controle de modo e visibilidade
    modoOperacao         = 'apex';
    modoBusca            = '';
    mostrarBlocoCep      = false;
    mostrarBlocoEndereco = false;

    //Campos capturados dos inputs
    cepDigitado    = '';
    ruaDigitada    = ''
    cidadeDigitada = '';
    ufSelecionada  = '';

    //Resposta do Apex
    enderecos = [];
    erro      = '';

    //timer do debounce
    _debounceTimer;


    //GETTERS

    //combobox principal
    get opcoesModoOperacao() {
        return [
            { label: 'LWC - busca local', value: 'lwc'  },
            { label: 'Apex - busca no servidor', value: 'apex' }
        ];
    }

    get opcoesModo() {
        return [
            { label: 'Buscar endereço a partir de um CEP', value: 'cep'      },
            { label: 'Buscar CEP a partir de um endereço', value: 'endereco' }
        ];
    }

    get opcoesUF() {
        return UFS.map(uf => ({ label: uf, value: uf }));
    }

    get podeBuscarPorEndereco() {
        return (
            this.ufSelecionada.length  === 2 &&
            this.cidadeDigitada.length >= 3  &&
            this.ruaDigitada.length    >= 3
        );
    }

    get notPodeBuscarPorEndereco() {
        return !this.podeBuscarPorEndereco;
    }


    //HANDLERS E MÉTODOS 

    //troca de modo, sem mudança
    handleMudancaOperacao(event) {
        this.modoOperacao = event.detail.value;
        this.erro = '';
        this.enderecos = [];
    }

    handleMudancaModo(event) {
        this.modoBusca = event.detail.value;

        // Reseta os campos ao trocar de modo
        this.cepDigitado    = '';   
        this.ruaDigitada    = '';
        this.cidadeDigitada = '';
        this.ufSelecionada  = '';
        this.erro = '';
        this.enderecos = [];

        this.mostrarBlocoCep      = this.modoBusca === 'cep';
        this.mostrarBlocoEndereco = this.modoBusca === 'endereco';
    }

    //método reutilizável de debounce
    //fn    = a função que vai rodar depois do delay
    //delay = quantos milissegundos esperar
    debounce(fn, delay) {
        clearTimeout(this._debounceTimer);           // cancela o timer anterior
        this._debounceTimer = setTimeout(fn, delay); // agenda o novo
    }

    async buscarPorCep() {
        this.erro = '';
        try {
            if (this.modoOperacao === 'lwc') {
                const resultado = this.buscarPorCepLocal(this.cepDigitado);
                this.enderecos = resultado ? [resultado] : [];
                return;
            }

            const resultado = await buscarPorCep({ cep: this.cepDigitado });
            this.enderecos = resultado ? [resultado] : [];
        } catch (error) {
            this.enderecos = [];
            this.erro = error?.body?.message || error?.message || 'Erro ao buscar CEP.';
        }
    }

    async buscarPorEndereco() {
        this.erro = '';
        try {
            if (this.modoOperacao === 'lwc') {
                this.enderecos = this.buscarPorEnderecoLocal(
                    this.ufSelecionada,
                    this.cidadeDigitada,
                    this.ruaDigitada
                );
                return;
            }

            const resultado = await buscarPorEndereco({
                uf: this.ufSelecionada,
                cidade: this.cidadeDigitada,
                rua: this.ruaDigitada
            });
            this.enderecos = resultado || [];
        } catch (error) {
            this.enderecos = [];
            this.erro = error?.body?.message || error?.message || 'Erro ao buscar endereço.';
        }
    }

    buscarPorCepLocal(cep) {
        const normalizado = cep.replace(/\D/g, '');
        const resultado = LOCAL_ADDRESS_DATA.find(item => item.cep.replace(/\D/g, '') === normalizado);
        if (!resultado) {
            this.erro = 'Nenhum CEP local encontrado no modo LWC.';
        }
        return resultado;
    }

    buscarPorEnderecoLocal(uf, cidade, rua) {
        const resultado = LOCAL_ADDRESS_DATA.filter(item =>
            item.uf === uf &&
            item.cidade.toLowerCase().includes(cidade.trim().toLowerCase()) &&
            item.rua.toLowerCase().includes(rua.trim().toLowerCase())
        );
        if (!resultado.length) {
            this.erro = 'Nenhum endereço local encontrado no modo LWC.';
        }
        return resultado;
    }

    //captura o CEP digitado
    handleCepChange(event) {
        this.cepDigitado = event.detail.value
            .replace(/\D/g, '')  // remove tudo que não for número
            .substring(0, 8);    // limita a 8 dígitos

        // Se for modo APEX, busca automática em tempo real com debounce
        if (this.modoOperacao === 'apex') {
            this.debounce(() => {
                if (this.cepDigitado.length === 8) {
                    this.buscarPorCep();
                }
            }, 400);
        }
    }

    //disparado ao pressionar tecla no input de CEP
    handleCepKeyPress(event) {
        if (event.key === 'Enter') {
            this.handleBuscarCep();
        }
    }

    //disparado ao clicar no botão de busca
    handleBuscarCep() {
        if (this.cepDigitado.length === 8) {
            this.buscarPorCep();
        } else {
            this.erro = 'Por favor, digite 8 dígitos do CEP.';
        }
    }

    //captura a rua digitada
    handleRuaChange(event) {
        this.ruaDigitada = event.detail.value;

        // Se for modo APEX, busca automática em tempo real com debounce
        if (this.modoOperacao === 'apex' && this.podeBuscarPorEndereco) {
            this.debounce(() => {
                this.buscarPorEndereco();
            }, 600);
        }
    }

    //captura a cidade digitada
    handleCidadeChange(event) {
        this.cidadeDigitada = event.detail.value;

        // Se for modo APEX, busca automática em tempo real com debounce
        if (this.modoOperacao === 'apex' && this.podeBuscarPorEndereco) {
            this.debounce(() => {
                this.buscarPorEndereco();
            }, 600);
        }
    }

    //captura a UF selecionada
    handleUFChange(event) {
        this.ufSelecionada = event.detail.value;

        // Se for modo APEX, busca automática em tempo real com debounce
        if (this.modoOperacao === 'apex' && this.podeBuscarPorEndereco) {
            this.debounce(() => {
                this.buscarPorEndereco();
            }, 600);
        }
    }

    //disparado ao pressionar tecla nos inputs de endereço
    handleEnderecoKeyPress(event) {
        if (event.key === 'Enter' && this.podeBuscarPorEndereco) {
            this.handleBuscarEndereco();
        }
    }

    //disparado ao clicar no botão de busca de endereço
    handleBuscarEndereco() {
        if (this.podeBuscarPorEndereco) {
            this.buscarPorEndereco();
        }
    }
}