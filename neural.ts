/*
 * neural.ts
 * Author: Alexander Ivanov - ttecss at gmail
 *
 * This code is distributed under the WTFPL License. For more info check:
 * http://www.wtfpl.net/txt/copying/
 */

function random(from: number = 0, to: number = 0xFFFFFFFF)
{
	if( from > to )
	{
		throw "Invalid range";
	}
	
	return from + Math.round( Math.random()*(to - from) );
}
function randomChar()
{
	return String.fromCharCode( 65 + random(0,25)+random(0,1)*32);
}
function randomString( length: number )
{
	var str = '';
	
	while( str.length < length )
	{
		str += randomChar();
	}
	
	return str;
}

class Neuron
{
	private nodes: Neuron[] = [];
	private factor: number = 1;
	private name: string = '';
	
	constructor( private callback: Function, private parent: Brain )
	{
		this.name = randomString(10);
		this.log('born');
	}
	
	public getName()
	{
		return this.name;
	}
	
	public log(message: string, target: Neuron = this, payload: any = '')
	{
		if( message.indexOf('bad') + message.indexOf('range') + message.indexOf('offender') != -3)
		{
			console.log(this.name + ': '+ message + ' -> ' + target.getName(), payload);
		}
	}
	
	public connect( node: Neuron )
	{
		if( this.nodes.indexOf(node) + node.getNodes().indexOf(node) == -2 && node != this)
		{
			this.nodes.push(node);
			this.log('connect', node);
			
			return true;
		}
		
		return false;
	}
	
	public disconnect( node: Neuron )
	{
		var index;
		if( (index = this.nodes.indexOf(node)) != -1 )
		{
			var disconectee = this.nodes.splice(index, 1);
			
			this.log('disconnect', disconectee[0]);
		}
		else if( (index = node.getNodes().indexOf(node)) != -1 )
		{
			node.disconnect(this);
		}
		
		return index != -1;
	}
	
	public getNodes()
	{
		return this.nodes;
	}
	
	public getParent()
	{
		return this.parent;
	}
	
	public send( signal: number, stack: Neuron[] = [] )
	{
		this.log('received', stack[ stack.length - 1], signal);
		
		if( stack.indexOf(this) == -1 && signal > 0 )
		{
			var newSignal = this.process( signal );
			this.log('processed', this.nodes[i], newSignal);
			
			if( newSignal > 0 )
			{
				this.callback.call( this.parent, newSignal, this);
				stack.push(this);
				
				for( var i = 0; i<this.nodes.length; ++i )
				{
					this.nodes[i].send(newSignal, stack);
				}
				
				return true;
			}		
			else
			{
				var offender = stack.pop();
				
				if(offender)
				{
					this.log('offender', offender);				
					this.disconnect(offender);
				}
				else
				{
					this.log('input out of range');
				}
			}
		}
		
		return false;
	}
	
	private process( signal: number )
	{
		var sensitivity = 1 / this.factor;
		var normalize = 1 + sensitivity;
		
		var newSignal = (this.factor + signal * sensitivity) / normalize;
		var newFactor = newSignal / this.factor;
		
		var stretch = newFactor / this.factor;		
		
		if( stretch <= normalize )
		{
			this.factor = newFactor;
			return newSignal;
		}
		
		this.factor = signal;
		return normalize - stretch;
	}
}
class Job
{
	private timeout: number;
	private parent: Brain;
	
	constructor( 	private signal: number, 
					private source: Neuron, 
					private destination: Neuron, 
					private callback: Function,
					life: number )
	{
		var parent = this.parent = source.getParent();
		this.timeout = setTimeout( function(){ parent.dropJob(); }, life);
	}
	
	public getSource()
	{
		return this.source;
	}
	
	public getDestination()
	{
		return this.destination;
	}
	
	public execute()
	{
		this.source.send( this.signal );
	}
	
	public complete( signal: number )
	{
		clearTimeout(this.timeout);
		this.callback( signal, this.signal );
	}
}

class Brain
{
	private pool: Neuron[] = [];
	private jobQueue: Job[] = [];
	
	constructor( private neurons: number = 10, private dimensions: number = 3 )
	{
		while( this.pool.length < neurons )
		{
			this.addNeuron();
		}
		
		for( var i = 0; i < neurons; ++i )
		{
			this.connect(this.pool[i]);
		}
	}
	
	public job( signal: number, callback: Function, life: number = 100)
	{
		var destination: Neuron, source = this.pool[ random(0, this.neurons-1) ];
		do
		{
			destination = this.pool[ random(0, this.neurons-1) ];
		}
		while( destination == source );		
		
		var job = new Job(signal, source, destination, callback, life);
		this.jobQueue.unshift( job );
		
		if( this.jobQueue.length == 1 )
		{
			this.jobQueue[0].execute();
		}
	}
	
	public dropJob()
	{
		if( this.jobQueue.length )
		{
			var job = this.jobQueue.pop();
			var source = job.getSource();
			
			source.log('stopping bad job', job.getDestination());
			
			var index = this.pool.indexOf(source);
			if( index != -1 )
			{
				var newNode = this.addNeuron();
				
				this.pool.splice(index, 1, newNode);
				
				this.connect(newNode);
			}
			
			if( this.jobQueue.length > 0)
			{
				this.jobQueue[ this.jobQueue.length - 1 ].execute();
			}
		}
	}
	
	public addNeuron()
	{
		var neuron = new Neuron( this.callback, this );
		this.pool.push( neuron );
		
		return neuron;
	}
	
	private connect( node: Neuron )
	{
		var connections = this.dimensions * Math.pow(2, this.dimensions);
		for ( var k = 0; k<connections; ++k )
		{
			node.connect( this.pool[ random(0, this.neurons-1) ] );
		}
	}
	
	private callback( signal: number, target: Neuron )
	{
		
		if( this.jobQueue.length && this.jobQueue[ this.jobQueue.length -1 ].getDestination() == target )
		{
			var job = this.jobQueue.pop();
			job.complete( signal );
			
			if( this.jobQueue.length > 0)
			{
				this.jobQueue[ this.jobQueue.length - 1 ].execute();
			}
		}
	}
}

var brain = new Brain(1000,3);

brain.job( 3 , function(t,f){
	console.log( f, '->', t);
});