export type AttributeTransformationMap = Map<string, Transformation>;

export type Transformation = {input?: Transformer; output?: Transformer};

export type Transformer = (value: any, context: TransformerContext) => any;

export type TransformerContext = {source?: string; target?: string};
