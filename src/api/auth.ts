import http from 'http';
export const loginAPi =(data:{studentId:string,password:string})=>{

    return http.post('/api/login',data)
}