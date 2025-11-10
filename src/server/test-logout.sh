#!/bin/bash

# Script para testar o logout e token blacklist
# Demonstra como o token é revogado e não pode mais ser usado

API_URL="http://localhost:4000/api/v1"
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}=== Teste de Logout e Token Blacklist ===${NC}\n"

# 1. Primeiro, você precisa ter um token JWT válido
# (normalmente você obtém isso ao fazer login/connect)
echo "1. Obtenha um token JWT fazendo login..."
echo "   POST ${API_URL}/auth/connect"
echo "   { \"walletAddress\": \"seu_wallet\", \"signature\": \"...\", \"message\": \"...\" }"
echo ""
read -p "Digite seu token JWT (ou pressione Enter para usar um token de exemplo): " TOKEN

if [ -z "$TOKEN" ]; then
    echo -e "${RED}Token não fornecido. Use um token válido do seu sistema.${NC}"
    exit 1
fi

echo -e "\n${GREEN}✓ Token recebido${NC}\n"

# 2. Testar acesso com token válido
echo "2. Testando acesso com token válido..."
echo "   GET ${API_URL}/auth/profile"
PROFILE_RESPONSE=$(curl -s -w "\nHTTP_STATUS:%{http_code}" \
    -H "Authorization: Bearer $TOKEN" \
    "${API_URL}/auth/profile")

HTTP_STATUS=$(echo "$PROFILE_RESPONSE" | grep "HTTP_STATUS" | cut -d: -f2)
PROFILE_BODY=$(echo "$PROFILE_RESPONSE" | sed '/HTTP_STATUS/d')

if [ "$HTTP_STATUS" = "200" ]; then
    echo -e "${GREEN}✓ Token válido - acesso permitido${NC}"
    echo "   Resposta: $PROFILE_BODY"
else
    echo -e "${RED}✗ Token inválido ou erro${NC}"
    echo "   Status: $HTTP_STATUS"
    echo "   Resposta: $PROFILE_BODY"
    exit 1
fi

echo ""

# 3. Fazer logout (revogar token)
echo "3. Fazendo logout (revogando token)..."
echo "   POST ${API_URL}/auth/logout"
LOGOUT_RESPONSE=$(curl -s -w "\nHTTP_STATUS:%{http_code}" \
    -X POST \
    -H "Authorization: Bearer $TOKEN" \
    "${API_URL}/auth/logout")

HTTP_STATUS=$(echo "$LOGOUT_RESPONSE" | grep "HTTP_STATUS" | cut -d: -f2)
LOGOUT_BODY=$(echo "$LOGOUT_RESPONSE" | sed '/HTTP_STATUS/d')

if [ "$HTTP_STATUS" = "200" ]; then
    echo -e "${GREEN}✓ Logout realizado com sucesso${NC}"
    echo "   Resposta: $LOGOUT_BODY"
else
    echo -e "${RED}✗ Erro no logout${NC}"
    echo "   Status: $HTTP_STATUS"
    echo "   Resposta: $LOGOUT_BODY"
fi

echo ""

# 4. Tentar usar o token revogado
echo "4. Tentando usar o token REVOGADO..."
echo "   GET ${API_URL}/auth/profile"
REVOKED_RESPONSE=$(curl -s -w "\nHTTP_STATUS:%{http_code}" \
    -H "Authorization: Bearer $TOKEN" \
    "${API_URL}/auth/profile")

HTTP_STATUS=$(echo "$REVOKED_RESPONSE" | grep "HTTP_STATUS" | cut -d: -f2)
REVOKED_BODY=$(echo "$REVOKED_RESPONSE" | sed '/HTTP_STATUS/d')

if [ "$HTTP_STATUS" = "401" ]; then
    echo -e "${GREEN}✓ Token foi REVOGADO corretamente!${NC}"
    echo "   Status: 401 (Unauthorized)"
    echo "   Resposta: $REVOKED_BODY"
    echo -e "\n${GREEN}🎉 Teste PASSOU! Token blacklist está funcionando!${NC}"
else
    echo -e "${RED}✗ Token ainda funciona após logout - PROBLEMA!${NC}"
    echo "   Status: $HTTP_STATUS"
    echo "   Resposta: $REVOKED_BODY"
    echo -e "\n${RED}❌ Teste FALHOU! Token deveria estar revogado.${NC}"
    exit 1
fi

echo ""

# 5. Verificar estatísticas da blacklist
echo "5. Verificando estatísticas da blacklist..."
echo "   GET ${API_URL}/auth/sessions"
STATS_RESPONSE=$(curl -s \
    -H "Authorization: Bearer $TOKEN" \
    "${API_URL}/auth/sessions" 2>/dev/null || echo "Token revogado - não pode acessar")

echo "   Resposta: $STATS_RESPONSE"

echo ""
echo -e "${GREEN}=== Teste Concluído ===${NC}"

