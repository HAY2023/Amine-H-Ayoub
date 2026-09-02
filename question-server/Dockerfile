# سيرفر الأسئلة على HuggingFace Spaces
FROM node:20-alpine
WORKDIR /app
COPY server.mjs .
RUN mkdir -p src/data
# نص المصحف يُنسخ من المستودع الرئيسي عند البناء
COPY localQuranCorpus.json ./src/data/
ENV PORT=7860
EXPOSE 7860
CMD ["node", "server.mjs"]