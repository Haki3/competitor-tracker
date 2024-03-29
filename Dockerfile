# Utiliza la imagen base de Node.js 16
FROM --platform=linux/amd64 node:latest

# Establece el directorio de trabajo dentro del contenedor
WORKDIR /app

# Copia los archivos de la aplicación incluyendo package.json
COPY package.json package-lock.json* ./

# Instala las dependencias de Node.js
RUN npm install

# Copia el resto de los archivos de la aplicación
COPY . .

# Expone el puerto en el que la aplicación se ejecutará
EXPOSE 3000

# Comando para ejecutar la aplicación Node.js
CMD ["node", "app.js"]
