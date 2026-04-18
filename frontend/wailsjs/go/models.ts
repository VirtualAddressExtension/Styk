export namespace disk_base {
	
	export class DiskOptions {
	    MountPath: string;
	    CacheSizeInBytes: number;
	    CacheMode: number;
	
	    static createFrom(source: any = {}) {
	        return new DiskOptions(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.MountPath = source["MountPath"];
	        this.CacheSizeInBytes = source["CacheSizeInBytes"];
	        this.CacheMode = source["CacheMode"];
	    }
	}

}

