export namespace disk_base {
	
	export class DiskOptions {
	    RemoteMountPath: string;
	    LocalMountPath: string;
	    CacheSizeInBytes: number;
	    CacheMode: number;
	
	    static createFrom(source: any = {}) {
	        return new DiskOptions(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.RemoteMountPath = source["RemoteMountPath"];
	        this.LocalMountPath = source["LocalMountPath"];
	        this.CacheSizeInBytes = source["CacheSizeInBytes"];
	        this.CacheMode = source["CacheMode"];
	    }
	}

}

