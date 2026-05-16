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


//CLASSE 
export default class BuscaCep extends LightningElement {


    //PROPRIEDADES REATIVAS 
    //controle de modo e visibilidade
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


    //HANDLERS E MÉTODOS 

    //troca de modo, sem mudança
    handleMudancaModo(event) {
        this.modoBusca = event.detail.value;

        // Reseta os campos ao trocar de modo
        this.cepDigitado    = '';   
        this.ruaDigitada    = '';
        this.cidadeDigitada = '';
        this.ufSelecionada  = '';

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

    //captura o CEP digitado
    handleCepChange(event) {
        this.cepDigitado = event.detail.value
            .replace(/\D/g, '')  // remove tudo que não for número
            .substring(0, 8);    // limita a 8 dígitos

        this.debounce(() => {
            if (this.cepDigitado.length === 8) {
                this.buscarPorCep();
            }
        }, 400);
    }

    //captura a rua digitada
    handleRuaChange(event) {
        this.ruaDigitada = event.detail.value;

        this.debounce(() => {
            if (this.podeBuscarPorEndereco) {
                this.buscarPorEndereco();
            }
        }, 600);
    }

    //captura a cidade digitada
    handleCidadeChange(event) {
        this.cidadeDigitada = event.detail.value;

        this.debounce(() => {
            if (this.podeBuscarPorEndereco) {
                this.buscarPorEndereco();
            }
        }, 600);
    }

    //captura a UF selecionada
    //Combobox não precisa de debounce: a seleção já é um valor completo
    handleUFChange(event) {
        this.ufSelecionada = event.detail.value;

        if (this.podeBuscarPorEndereco) {
            this.buscarPorEndereco();
        }
    }
}