const { app } = require('@azure/functions');
const axios = require('axios');

app.http('generations', {
    route: 'images/generations',
    methods: ['POST'],
    authLevel: 'anonymous',
    handler: async (request, context) => {
        try {
            // 1. 获取原始请求信息
            let reqBody = await request.json();
            //let reqHeaders = { ...request.headers };
            let reqHeaders = Object.fromEntries(request.headers.entries()); 
            reqHeaders['content-type'] = 'application/json';
            reqHeaders['host'] = undefined
            reqHeaders['content-length'] = undefined

            // 2. 转换 size 字段
            if (reqBody.size) {
                reqBody.image_size = reqBody.size;
                delete reqBody.size;
            }
//context.log('请求头'+JSON.stringify(reqHeaders));
            // 3. 转发请求到目标 API
            const apiResponse = await axios.post(
                'https://api.siliconflow.cn/v1/images/generations',
                reqBody,
                { headers: reqHeaders }
            );

            // 4. 获取图片并转换格式
            const imageUrl = apiResponse.data.images?.[0]?.url;
            if (!imageUrl) throw new Error('No image URL found');
            
            const imageRes = await axios.get(imageUrl, { responseType: 'arraybuffer' });
            const base64Image = Buffer.from(imageRes.data).toString('base64');

            // 5. 返回 OpenAI 格式
            return {
                status: 200,
                jsonBody: {
                    data: [{
                        b64_json: base64Image
                    }]
                }
            };

        } catch (error) {
            context.log('Error:', error);
            return {
                status: 500,
                jsonBody: {
                    error: {
                        message: error.response?.data?.error || 'Internal Server Error'
                    }
                }
            };
        }
    }
});
