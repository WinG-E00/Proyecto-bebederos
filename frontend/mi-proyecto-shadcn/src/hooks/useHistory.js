import { useLiveQuery } from './useLiveQuery.js'
export function useHistory({farmId='',type='',from='',to='',page=1,resourceType,resourceId}={}) {
 const params=new URLSearchParams({page:String(page)})
 for(const [key,value] of Object.entries({farmId,type,from,to}))if(value)params.set(key,value)
 const path=resourceType&&resourceId?`/${resourceType}/${resourceId}/history`:'/history'
 return useLiveQuery('history',`${path}?${params}`,farmId||'all')
}
