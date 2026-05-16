public with sharing class BuscaCepService {
    public class Endereco {
        @AuraEnabled public String cep;
        @AuraEnabled public String logradouro;
        @AuraEnabled public String complemento;
        @AuraEnabled public String bairro;
        @AuraEnabled public String localidade;
        @AuraEnabled public String uf;
        @AuraEnabled public String unidade;
        @AuraEnabled public String ibge;
        @AuraEnabled public String gia;
    }

    @AuraEnabled(cacheable=true)
    public static Endereco buscarPorCep(String cep) {
        String cepLimpo = normalizeCep(cep);
        if (cepLimpo == null) {
            throw new AuraHandledException('CEP inválido. Informe 8 dígitos.');
        }

        Object responseObject = callViaCep('https://viacep.com.br/ws/' + cepLimpo + '/json/');
        if (!(responseObject instanceof Map<String, Object>)) {
            throw new AuraHandledException('CEP não encontrado.');
        }

        Map<String, Object> data = (Map<String, Object>) responseObject;
        if (data == null || data.containsKey('erro')) {
            throw new AuraHandledException('CEP não encontrado.');
        }

        return mapToEndereco(data);
    }

    @AuraEnabled(cacheable=true)
    public static List<Endereco> buscarPorEndereco(String uf, String cidade, String rua) {
        if (String.isBlank(uf) || String.isBlank(cidade) || String.isBlank(rua)) {
            throw new AuraHandledException('UF, cidade e rua são obrigatórios.');
        }

        uf = uf.trim();
        cidade = EncodingUtil.urlEncode(cidade.trim(), 'UTF-8');
        rua = EncodingUtil.urlEncode(rua.trim(), 'UTF-8');

        Object responseObject = callViaCep('https://viacep.com.br/ws/' + uf + '/' + cidade + '/' + rua + '/json/');
        if (responseObject == null || !(responseObject instanceof List<Object>)) {
            return new List<Endereco>();
        }

        List<Object> results = (List<Object>) responseObject;
        List<Endereco> enderecos = new List<Endereco>();
        for (Object item : results) {
            if (item instanceof Map<String, Object>) {
                enderecos.add(mapToEndereco((Map<String, Object>) item));
            }
        }
        return enderecos;
    }

    private static Object callViaCep(String endpoint) {
        HttpRequest request = new HttpRequest();
        request.setEndpoint(endpoint);
        request.setMethod('GET');
        request.setTimeout(60000);

        Http http = new Http();
        HttpResponse response = http.send(request);

        if (response.getStatusCode() != 200) {
            return null;
        }

        return JSON.deserializeUntyped(response.getBody());
    }

    private static Endereco mapToEndereco(Map<String, Object> data) {
        Endereco endereco = new Endereco();
        endereco.cep = (String) data.get('cep');
        endereco.logradouro = (String) data.get('logradouro');
        endereco.complemento = (String) data.get('complemento');
        endereco.bairro = (String) data.get('bairro');
        endereco.localidade = (String) data.get('localidade');
        endereco.uf = (String) data.get('uf');
        endereco.unidade = (String) data.get('unidade');
        endereco.ibge = (String) data.get('ibge');
        endereco.gia = (String) data.get('gia');
        return endereco;
    }

    private static String normalizeCep(String cep) {
        if (String.isBlank(cep)) {
            return null;
        }
        String cepLimpo = cep.replaceAll('[^0-9]', '');
        return cepLimpo.length() == 8 ? cepLimpo : null;
    }
}
