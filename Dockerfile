# Utiliza la imagen base de Node.js tipo alpine
FROM node:alpine

# Instala Chromium y sus dependencias con el usuario root
USER root
RUN apk add --no-cache chromium

# Establece la variable de entorno para Puppeteer
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser

# Instala las dependencias de Python con el usuario root
RUN apk add --no-cache python3 py3-pip

# Establece el directorio de trabajo dentro del contenedor
WORKDIR /app

# Cambiar el propietario y los permisos del directorio de salida con el usuario node
RUN mkdir /app/output && \
    chmod -R 777 /app/output && \
    chown -R node:node /app    # Cambia el propietario de /app al usuario node

# Copia los archivos de la aplicación incluyendo package.json
COPY package.json package-lock.json* ./

# Instala las dependencias de Node.js
RUN npm install

# Copia el resto de los archivos de la aplicación
COPY . .

# Cambia al usuario node para las siguientes instrucciones
USER node

# Instala y configura el entorno virtual de Python
RUN python3 -m venv /app/venv
ENV PATH="/app/venv/bin:$PATH"

# Cambia los permisos del directorio del entorno virtual
USER root
RUN chmod -R 777 /app/venv && \
    chown -R node:node /app/venv

# Cambia nuevamente al usuario node
USER node

# Copia el archivo requirements.txt al contenedor
COPY requirements.txt .

# Instala las dependencias de Python dentro del entorno virtual
RUN pip install --no-cache-dir -r requirements.txt

# Expone el puerto en el que la aplicación se ejecutará
EXPOSE 3000

# Comando para ejecutar la aplicación Node.js
CMD ["node", "app.js"]
