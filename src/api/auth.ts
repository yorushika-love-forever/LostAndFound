import axios from 'axios'
export const loginApi = (data:{studentId:string,password:string})=>{
    http://121.40.225.123:8080/login
    return axios.post('/api/login',data)
}