# Utiliza la imagen base de Node.js 16
FROM --platform=linux/amd64 node:latest

# Instala Chromium y sus dependencias
RUN apk add --no-cache chromium

# Establece la variable de entorno para Puppeteer
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser

# Instala las dependencias de Python
RUN apk add --no-cache python3 py3-pip

# Establece el directorio de trabajo dentro del contenedor
WORKDIR /app

# Copia los archivos de la aplicación incluyendo package.json
COPY package.json package-lock.json* ./

# Instala las dependencias de Node.js
RUN npm install

# Copia el resto de los archivos de la aplicación
COPY . .

# Instala y configura el entorno virtual de Python
RUN python3 -m venv /venv
ENV PATH="/venv/bin:$PATH"

# Copia el archivo requirements.txt al contenedor
COPY requirements.txt .

# Instala las dependencias de Python dentro del entorno virtual
RUN pip install --no-cache-dir -r requirements.txt

# Expone el puerto en el que la aplicación se ejecutará
EXPOSE 3000

# Comando para ejecutar la aplicación Node.js
CMD ["node", "app.js"]
